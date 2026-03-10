import random

class CodenamesLogic:
    def __init__(self):
        self.reset()

    def reset(self):
        self.cards = []
        self.current_turn = "Red"
        self.red_remaining = 9
        self.blue_remaining = 8
        self.is_game_over = False
        self.winner = None
        self.reason = ""
        self.assassin_email = None
        self.clue = None
        self.guesses_made = 0
        self.log = []
        self.correct_guesses_this_turn = 0
        self.wrong_guesses_this_turn = 0

    def set_clue(self, word, count):
        self.clue = {"word": word, "count": count}
        self.guesses_made = 0
        self.correct_guesses_this_turn = 0
        self.wrong_guesses_this_turn = 0
        team_he = "אדום" if self.current_turn == "Red" else "כחול"
        self.log.append(f'רב-מרגלים ({team_he}) שידר: {word} ({count})')
        return self.get_state()

    def end_turn(self, manual=False):
        # If the operative ends early via button, log the cancel action.
        if manual and self.clue is not None:
            team_he = "אדום" if self.current_turn == "Red" else "כחול"
            self.log.append(f'סוכן שטח ({team_he}) ביטל משימה')
        self.current_turn = "Blue" if self.current_turn == "Red" else "Red"
        self.clue = None
        self.guesses_made = 0
        self.correct_guesses_this_turn = 0
        self.wrong_guesses_this_turn = 0
        return self.get_state()
    
    def initialize_game(self, words):
        # Create types: 9 Red, 8 Blue, 7 Neutral, 1 Assassin
        types = (["Red"] * 9) + (["Blue"] * 8) + (["Neutral"] * 7) + (["Assassin"])
        random.shuffle(types)
        
        self.cards = []
        for i in range(25):
            self.cards.append({
                "word": words[i],
                "type": types[i],
                "revealed": False
            })
        self.red_remaining = 9
        self.blue_remaining = 8
        self.current_turn = "Red"
        self.is_game_over = False
        self.clue = None
        self.guesses_made = 0
        self.log = []
        self.correct_guesses_this_turn = 0
        self.wrong_guesses_this_turn = 0
        return self.get_state()

    def handle_guess(self, word_text, player_email):
        if self.is_game_over: return self.get_state()
        if self.clue is None: return self.get_state()
        original_turn = self.current_turn

        for card in self.cards:
            if card["word"] == word_text and not card["revealed"]:
                card["revealed"] = True
                self.guesses_made += 1
                
                # Check Card Type Logic
                if card["type"] == "Assassin":
                    self.is_game_over = True
                    self.winner = "Blue" if self.current_turn == "Red" else "Red"
                    self.reason = "הסוכן החשאי נחשף! המשימה נכשלה."
                    self.assassin_email = player_email
                    team_he = "אדום" if original_turn == "Red" else "כחול"
                    self.log.append(f'סוכן שטח ({team_he}) חשף מתנקש')
                
                elif card["type"] == "Red":
                    self.red_remaining -= 1
                    if self.current_turn == "Blue": # Guessed wrong team's card
                        self.current_turn = "Red" 
                
                elif card["type"] == "Blue":
                    self.blue_remaining -= 1
                    if self.current_turn == "Red": # Guessed wrong team's card
                        self.current_turn = "Blue"
                
                elif card["type"] == "Neutral":
                    # Turn ends
                    self.current_turn = "Blue" if self.current_turn == "Red" else "Red"

                # Track per-turn result summary (treat Neutral as "enemy" for logging simplicity)
                if not self.is_game_over:
                    is_correct = (
                        (original_turn == "Red" and card["type"] == "Red") or
                        (original_turn == "Blue" and card["type"] == "Blue")
                    )
                    if is_correct:
                        self.correct_guesses_this_turn += 1
                    else:
                        self.wrong_guesses_this_turn += 1

                # Check Win Conditions
                if self.red_remaining == 0:
                    self.is_game_over = True
                    self.winner = "Red"
                    self.reason = "כל הסוכנים האדומים אותרו!"
                elif self.blue_remaining == 0:
                    self.is_game_over = True
                    self.winner = "Blue"
                    self.reason = "כל הסוכנים הכחולים אותרו!"

                # If game isn't over, enforce "exact N guesses" and turn-switch rules.
                if not self.is_game_over:
                    turn_switched_by_mistake = self.current_turn != original_turn
                    if turn_switched_by_mistake:
                        team_he = "אדום" if original_turn == "Red" else "כחול"
                        self.log.append(
                            f'סוכן שטח ({team_he}) ניחש {self.correct_guesses_this_turn} מסרים נכונים'
                        )
                        # A wrong guess (neutral/opponent) ends the turn immediately.
                        self.clue = None
                        self.guesses_made = 0
                        self.correct_guesses_this_turn = 0
                        self.wrong_guesses_this_turn = 0
                    else:
                        # Correct guess for the active team: allow exactly N guesses.
                        if self.guesses_made >= self.clue["count"]:
                            team_he = "אדום" if original_turn == "Red" else "כחול"
                            self.log.append(f'סוכן שטח ({team_he}) ניחש {self.correct_guesses_this_turn} מסרים נכונים')
                            self.end_turn()
                
                break
        
        return self.get_state()

    def get_state(self):
        return {
            "cards": self.cards,
            "currentTurn": self.current_turn,
            "redRemaining": self.red_remaining,
            "blueRemaining": self.blue_remaining,
            "isGameOver": self.is_game_over,
            "winner": self.winner,
            "reason": self.reason,
            "assassinEmail": self.assassin_email,
            "clue": self.clue,
            "guessesMade": self.guesses_made,
            "log": self.log
        }