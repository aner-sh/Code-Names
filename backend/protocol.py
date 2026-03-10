import json

def send_packet(sock, msg_type, payload):
    """Wraps data in our custom JSON protocol and sends it."""
    message = json.dumps({"type": msg_type, "payload": payload})
    sock.sendall(message.encode('utf-8'))

def broadcast(players, msg_type, payload):
    """Sends a message to a list of player sockets."""
    for player in players:
        try:
            send_packet(player['socket'], msg_type, payload)
        except:
            pass # Handle disconnected players