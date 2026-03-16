import socket
import threading
import json
import random
import string
import os
import ssl
from game_logic import CodenamesLogic
from auth import hash_password, verify_password, create_token, verify_token
from users_store import get_user, create_user, update_user_stats, load_users

# Load environment variables from the .env file
from dotenv import load_dotenv 
load_dotenv()

PORT = 3000
rooms = {}
client_connections = []

def generate_mission_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def broadcast_to_room(room_code, message_type, payload):
    msg = json.dumps({"type": message_type, "payload": payload}) + "\n"
    for client in client_connections:
        if client.get('roomCode') == room_code:
            try:
                client['socket'].sendall(msg.encode('utf-8'))
            except: pass

def _send(conn, message_type, payload):
    conn.sendall((json.dumps({"type": message_type, "payload": payload}) + "\n").encode("utf-8"))

def _is_valid_username(username: str) -> bool:
    if not isinstance(username, str):
        return False
    username = username.strip()
    if len(username) < 3 or len(username) > 24:
        return False
    return username.replace("_", "").isalnum()

def _is_valid_password(password: str) -> bool:
    return isinstance(password, str) and len(password) >= 8 and len(password) <= 128

def _require_auth(token: str) -> str | None:
    if not isinstance(token, str) or not token:
        return None
    return verify_token(token)

def handle_client(conn, addr):
    client_info = {'socket': conn, 'roomCode': None, 'email': None, 'username': None}
    client_connections.append(client_info)
    buffer = ""
    
    while True:
        try:
            data = conn.recv(4096).decode('utf-8')
            if not data: break
            buffer += data
            
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                msg = json.loads(line)
                m_type, payload = msg.get("type"), msg.get("payload")

                if m_type == "register_user":
                    username, password = payload
                    if not _is_valid_username(username):
                        _send(conn, "auth_error", {"message": "שם משתמש לא תקין"})
                        continue
                    if not _is_valid_password(password):
                        _send(conn, "auth_error", {"message": "סיסמה חייבת להכיל לפחות 8 תווים"})
                        continue
                    if get_user(username):
                        _send(conn, "auth_error", {"message": "שם משתמש תפוס"})
                        continue
                    try:
                        u = create_user(username, hash_password(password))
                        token = create_token(username)
                        client_info["username"] = username
                        client_info["email"] = username
                        _send(conn, "auth_success", {"username": username, "token": token, "stats": u})
                    except Exception:
                        _send(conn, "auth_error", {"message": "שגיאה בהרשמה"})
                    continue

                elif m_type == "login_user":
                    username, password = payload
                    if not _is_valid_username(username) or not isinstance(password, str):
                        _send(conn, "auth_error", {"message": "פרטי התחברות לא תקינים"})
                        continue
                    u = get_user(username)
                    if not u or not verify_password(password, u.get("password_hash", "")):
                        _send(conn, "auth_error", {"message": "שם משתמש או סיסמה שגויים"})
                        continue
                    token = create_token(username)
                    client_info["username"] = username
                    client_info["email"] = username
                    _send(conn, "auth_success", {"username": username, "token": token, "stats": u})
                    continue

                if m_type == "create_room":
                    token, player, is_local = payload
                    username = _require_auth(token)
                    if not username or username != player.get("email"):
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    code = generate_mission_code()
                    rooms[code] = {
                        "players": [{**player, "isRoomCreator": True}],
                        "logic": CodenamesLogic(),
                        "isLocal": is_local
                    }
                    client_info.update({'roomCode': code, 'email': player['email']})
                    _send(conn, "room_created", {"roomCode": code, "players": rooms[code]["players"], "isLocal": is_local})

                elif m_type == "join_room":
                    token, code, player = payload
                    username = _require_auth(token)
                    if not username or username != player.get("email"):
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        rooms[code]["players"].append({**player, "isRoomCreator": False})
                        client_info.update({'roomCode': code, 'email': player['email']})
                        _send(conn, "join_success", {"roomCode": code, "players": rooms[code]["players"], "gameState": rooms[code]["logic"].get_state()})
                        broadcast_to_room(code, "room_updated", {"players": rooms[code]["players"]})
                    else:
                        _send(conn, "join_error", {"message": "חדר לא נמצא"})

                elif m_type == "start_game":
                    token, code, words = payload
                    username = _require_auth(token)
                    if not username:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        state = rooms[code]["logic"].initialize_game(words)
                        broadcast_to_room(code, "game_started", state)

                elif m_type == "give_clue":
                    token, code, word, count = payload
                    username = _require_auth(token)
                    if not username:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        state = rooms[code]["logic"].set_clue(word, count)
                        broadcast_to_room(code, "game_updated", state)

                elif m_type == "make_guess":
                    token, code, word_text, email = payload
                    username = _require_auth(token)
                    if not username or username != email:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        state = rooms[code]["logic"].handle_guess(word_text, email)
                        if state["isGameOver"]:
                            # Persist user stats (encrypted at rest)
                            winner = state.get("winner")  # "Red"/"Blue"
                            assassin_email = state.get("assassinEmail")
                            players = rooms[code].get("players", [])
                            for p in players:
                                p_email = p.get("email")
                                team = p.get("team")  # Hebrew strings in UI enums
                                # Team mapping: UI uses Hebrew values; logic uses "Red"/"Blue"
                                is_winner = (winner == "Red" and team == "אדום") or (winner == "Blue" and team == "כחול")
                                update_user_stats(p_email, win=is_winner, assassin_hit=(assassin_email == p_email))
                            broadcast_to_room(code, "game_over", state)
                        else:
                            broadcast_to_room(code, "game_updated", state)

                elif m_type == "end_turn":
                    token, code = payload
                    username = _require_auth(token)
                    if not username:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        logic = rooms[code]["logic"]
                        state = logic.end_turn(manual=True)
                        broadcast_to_room(code, "game_updated", state)

                elif m_type == "leave_room":
                    token, code, email = payload
                    username = _require_auth(token)
                    if not username or username != email:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        rooms[code]["players"] = [p for p in rooms[code]["players"] if p.get("email") != email]
                        broadcast_to_room(code, "room_updated", {"players": rooms[code]["players"]})
                    client_info.update({'roomCode': None, 'email': None})

                elif m_type == "join_role":
                    token, code, email, team, role = payload
                    username = _require_auth(token)
                    if not username or username != email:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        for p in rooms[code]["players"]:
                            if p.get("email") == email:
                                p["team"] = team
                                p["role"] = role
                        broadcast_to_room(code, "room_updated", {"players": rooms[code]["players"]})

                elif m_type == "reset_game":
                    token, code = payload
                    username = _require_auth(token)
                    if not username:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    if code in rooms:
                        rooms[code]["logic"].reset()
                        broadcast_to_room(code, "game_reset", {})

                elif m_type == "play_again":
                    token, code, email = payload
                    username = _require_auth(token)
                    if not username or username != email:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    # Minimal support: treat as reset_game initiated by any authenticated user
                    if code in rooms:
                        rooms[code]["logic"].reset()
                        broadcast_to_room(code, "game_reset", {})

                elif m_type == "get_leaderboard":
                    token = payload[0] if isinstance(payload, list) and payload else None
                    username = _require_auth(token)
                    if not username:
                        _send(conn, "auth_error", {"message": "לא מורשה"})
                        continue
                    users = load_users()
                    # Never expose password_hash
                    public = {
                        name: {
                            "username": u.get("username"),
                            "wins": u.get("wins", 0),
                            "losses": u.get("losses", 0),
                            "assassinHits": u.get("assassinHits", 0),
                            "gamesPlayed": u.get("gamesPlayed", 0),
                        }
                        for name, u in users.items()
                    }
                    _send(conn, "leaderboard", public)

        except: break

    conn.close()
    if client_info in client_connections: client_connections.remove(client_info)

def start_server():
    tls_enabled = os.environ.get("TLS_ENABLED", "1").strip() != "0"
    tls_cert = os.environ.get("TLS_CERT_FILE", "").strip()
    tls_key = os.environ.get("TLS_KEY_FILE", "").strip()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', PORT))
    server.listen()
    if tls_enabled:
        if not tls_cert or not tls_key:
            raise RuntimeError("TLS is enabled but TLS_CERT_FILE / TLS_KEY_FILE are missing")
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=tls_cert, keyfile=tls_key)
        print(f"Python server running with TLS on {PORT}")
    else:
        context = None
        print(f"TCP Server running on {PORT}")
    while True:
        conn, addr = server.accept()
        if context is not None:
            try:
                conn = context.wrap_socket(conn, server_side=True)
            except Exception:
                conn.close()
                continue
        threading.Thread(target=handle_client, args=(conn, addr)).start()

if __name__ == "__main__":
    start_server()