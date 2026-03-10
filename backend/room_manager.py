import uuid

rooms = {} # Global state: { room_code: {"players": [], "state": {}} }

def create_room(player_socket, user_data, is_local):
    room_code = str(uuid.uuid4())[:6].upper()
    rooms[room_code] = {
        "players": [{"socket": player_socket, **user_data}],
        "is_local": is_local,
        "state": None
    }
    return room_code

def join_room(room_code, player_socket, user_data):
    if room_code in rooms:
        rooms[room_code]["players"].append({"socket": player_socket, **user_data})
        return True
    return False