import socket
import threading
import json
import random
import string
from game_logic import CodenamesLogic

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

def handle_client(conn, addr):
    client_info = {'socket': conn, 'roomCode': None, 'email': None}
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

                if m_type == "create_room":
                    player, is_local = payload
                    code = generate_mission_code()
                    rooms[code] = {
                        "players": [{**player, "isRoomCreator": True}],
                        "logic": CodenamesLogic(),
                        "isLocal": is_local
                    }
                    client_info.update({'roomCode': code, 'email': player['email']})
                    conn.sendall((json.dumps({"type":"room_created", "payload":{"roomCode":code, "players":rooms[code]["players"], "isLocal":is_local}})+"\n").encode())

                elif m_type == "join_room":
                    code, player = payload
                    if code in rooms:
                        rooms[code]["players"].append({**player, "isRoomCreator": False})
                        client_info.update({'roomCode': code, 'email': player['email']})
                        conn.sendall((json.dumps({"type":"join_success", "payload":{"roomCode":code, "players":rooms[code]["players"], "gameState":rooms[code]["logic"].get_state()}})+"\n").encode())
                        broadcast_to_room(code, "room_updated", {"players": rooms[code]["players"]})

                elif m_type == "start_game":
                    code, words = payload
                    if code in rooms:
                        state = rooms[code]["logic"].initialize_game(words)
                        broadcast_to_room(code, "game_started", state)

                elif m_type == "give_clue":
                    code, word, count = payload
                    if code in rooms:
                        state = rooms[code]["logic"].set_clue(word, count)
                        broadcast_to_room(code, "game_updated", state)

                elif m_type == "make_guess":
                    code, word_text, email = payload
                    if code in rooms:
                        state = rooms[code]["logic"].handle_guess(word_text, email)
                        if state["isGameOver"]:
                            broadcast_to_room(code, "game_over", state)
                        else:
                            broadcast_to_room(code, "game_updated", state)

                elif m_type == "end_turn":
                    code = payload[0]
                    if code in rooms:
                        logic = rooms[code]["logic"]
                        state = logic.end_turn(manual=True)
                        broadcast_to_room(code, "game_updated", state)

        except: break

    conn.close()
    if client_info in client_connections: client_connections.remove(client_info)

def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', PORT))
    server.listen()
    print(f"TCP Server running on {PORT}")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr)).start()

if __name__ == "__main__":
    start_server()