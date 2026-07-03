import fs from 'fs';
import path from 'path';
class GameManager {
    constructor(sock) {
        this.sock = sock;
        this.activeGames = new Map();
        this.triviaQuestions = [
            { q: "What is the capital of France?", a: ["paris"], options: ["Paris", "London", "Berlin", "Madrid"] },
            { q: "Which planet is closest to the Sun?", a: ["mercury"], options: ["Venus", "Mercury", "Earth", "Mars"] },
            { q: "What is 2 + 2?", a: ["4", "four"], options: ["3", "4", "5", "6"] },
            { q: "Who created WhatsApp?", a: ["brian acton", "jan koum"], options: ["Mark Zuckerberg", "Brian Acton", "Elon Musk", "Bill Gates"] }
        ];
        this.hangmanWords = ["javascript", "whatsapp", "computer", "programming", "github", "craigee"];
    }

    async handleGameCommand(msg, command, args, sender) {
        const from = msg.key.remoteJid;
        
        switch(command) {
            case 'trivia':
                return await this.startTrivia(from, sender);
            case 'hangman':
                return await this.startHangman(from, sender);
            case 'dice':
                return await this.rollDice(from);
            case 'coinflip':
                return await this.flipCoin(from);
            case 'tictactoe':
                return await this.startTicTacToe(from, args, sender);
            case 'slot':
                return await this.slotMachine(from);
            case 'quiz':
                return await this.startQuiz(from, sender);
            case 'mathgame':
                return await this.mathGame(from, sender);
            case 'memorygame':
                return await this.memoryGame(from, sender);
            default:
                return null;
        }
    }

    async startTrivia(from, sender) {
        const question = this.triviaQuestions[Math.floor(Math.random() * this.triviaQuestions.length)];
        
        this.activeGames.set(from, {
            type: 'trivia',
            question: question,
            player: sender,
            startTime: Date.now()
        });

        const options = question.options.map((opt, index) => `${index + 1}. ${opt}`).join('\n');
        
        return await this.sock.sendMessage(from, {
            text: `🧠 *TRIVIA GAME*\n\n*Question:* ${question.q}\n\n${options}\n\n💡 *Reply with the number (1-4) or type the answer*\n⏰ *You have 30 seconds!*`
        });
    }

    async startHangman(from, sender) {
        const word = this.hangmanWords[Math.floor(Math.random() * this.hangmanWords.length)];
        const hiddenWord = '_'.repeat(word.length);
        
        this.activeGames.set(from, {
            type: 'hangman',
            word: word.toLowerCase(),
            hiddenWord: hiddenWord,
            guessedLetters: [],
            wrongGuesses: 0,
            maxWrongGuesses: 6,
            player: sender
        });

        return await this.sock.sendMessage(from, {
            text: `🎯 *HANGMAN GAME*\n\n*Word:* \`${hiddenWord}\`\n*Wrong Guesses:* 0/6\n*Guessed Letters:* None\n\n💡 *Type a letter to guess*\n🎪 *Guess the complete word to win instantly!*`
        });
    }

    async rollDice(from) {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;

        const diceEmoji = {
            1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
        };

        return await this.sock.sendMessage(from, {
            text: `🎲 *DICE ROLL*\n\nDice 1: ${diceEmoji[dice1]} (${dice1})\nDice 2: ${diceEmoji[dice2]} (${dice2})\n\n*Total:* ${total}`
        });
    }

    async flipCoin(from) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🥇';

        return await this.sock.sendMessage(from, {
            text: `${emoji} *COIN FLIP*\n\n*Result:* ${result}`
        });
    }

    async startTicTacToe(from, args, sender) {
        if (args.length === 0) {
            return await this.sock.sendMessage(from, {
                text: '❌ *Usage:* .tictactoe @opponent\n💡 *Mention someone to play against*'
            });
        }

        const board = [
            [' ', ' ', ' '],
            [' ', ' ', ' '],
            [' ', ' ', ' ']
        ];

        this.activeGames.set(from, {
            type: 'tictactoe',
            board: board,
            currentPlayer: sender,
            player1: sender,
            player2: args[0], // This should be extracted from mention
            moves: 0
        });

        const boardDisplay = this.displayTicTacToeBoard(board);

        return await this.sock.sendMessage(from, {
            text: `⭕ *TIC TAC TOE*\n\n${boardDisplay}\n\n*Player 1 (X):* @${sender.split('@')[0]}\n*Player 2 (O):* ${args[0]}\n\n💡 *Type position (1-9) to make a move*`,
            mentions: [sender]
        });
    }

    displayTicTacToeBoard(board) {
        let display = '```\n';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                display += board[i][j] === ' ' ? `${i * 3 + j + 1}` : board[i][j];
                if (j < 2) display += '|';
            }
            if (i < 2) display += '\n-+-+-\n';
        }
        display += '\n```';
        return display;
    }

    async slotMachine(from) {
        const symbols = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

        let result = '';
        if (reel1 === reel2 && reel2 === reel3) {
            result = '🎉 *JACKPOT! You won!*';
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            result = '✨ *Two in a row! Small win!*';
        } else {
            result = '😅 *No match. Try again!*';
        }

        return await this.sock.sendMessage(from, {
            text: `🎰 *SLOT MACHINE*\n\n[ ${reel1} | ${reel2} | ${reel3} ]\n\n${result}`
        });
    }

    async startQuiz(from, sender) {
        const questions = [
            { q: "What does HTML stand for?", a: ["hypertext markup language"], hint: "It's about web pages" },
            { q: "Who is the founder of Microsoft?", a: ["bill gates"], hint: "He's very rich" },
            { q: "What is the largest ocean?", a: ["pacific"], hint: "It's between Asia and America" }
        ];

        const question = questions[Math.floor(Math.random() * questions.length)];

        this.activeGames.set(from, {
            type: 'quiz',
            question: question,
            player: sender,
            startTime: Date.now(),
            hintsUsed: 0
        });

        return await this.sock.sendMessage(from, {
            text: `📚 *QUIZ TIME*\n\n*Question:* ${question.q}\n\n💡 *Type your answer*\n🔍 *Type "hint" for a clue*\n⏰ *You have 60 seconds!*`
        });
    }

    async mathGame(from, sender) {
        const operations = ['+', '-', '*'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        let num1, num2, answer;

        switch(operation) {
            case '+':
                num1 = Math.floor(Math.random() * 50) + 1;
                num2 = Math.floor(Math.random() * 50) + 1;
                answer = num1 + num2;
                break;
            case '-':
                num1 = Math.floor(Math.random() * 50) + 20;
                num2 = Math.floor(Math.random() * num1);
                answer = num1 - num2;
                break;
            case '*':
                num1 = Math.floor(Math.random() * 12) + 1;
                num2 = Math.floor(Math.random() * 12) + 1;
                answer = num1 * num2;
                break;
        }

        this.activeGames.set(from, {
            type: 'mathgame',
            question: `${num1} ${operation} ${num2}`,
            answer: answer,
            player: sender,
            startTime: Date.now()
        });

        return await this.sock.sendMessage(from, {
            text: `🔢 *MATH GAME*\n\n*Solve:* ${num1} ${operation} ${num2} = ?\n\n💡 *Type your answer*\n⏰ *You have 30 seconds!*`
        });
    }

    async memoryGame(from, sender) {
        const sequence = [];
        for (let i = 0; i < 4; i++) {
            sequence.push(Math.floor(Math.random() * 9) + 1);
        }

        this.activeGames.set(from, {
            type: 'memorygame',
            sequence: sequence,
            player: sender,
            phase: 'showing',
            userSequence: []
        });

        await this.sock.sendMessage(from, {
            text: `🧠 *MEMORY GAME*\n\n*Memorize this sequence:*\n\n${sequence.join(' - ')}\n\n*You have 10 seconds to memorize...*`
        });

        setTimeout(async () => {
            const game = this.activeGames.get(from);
            if (game && game.type === 'memorygame' && game.phase === 'showing') {
                game.phase = 'guessing';
                await this.sock.sendMessage(from, {
                    text: `❓ *Now type the sequence back!*\n\n*Format:* 1 2 3 4\n💡 *Separate numbers with spaces*`
                });
            }
        }, 10000);

        return true;
    }

    async handleGameResponse(msg, messageText, sender) {
        const from = msg.key.remoteJid;
        const game = this.activeGames.get(from);
        
        if (!game || game.player !== sender) return false;

        switch(game.type) {
            case 'trivia':
                return await this.handleTriviaResponse(from, messageText, game);
            case 'hangman':
                return await this.handleHangmanResponse(from, messageText, game);
            case 'quiz':
                return await this.handleQuizResponse(from, messageText, game);
            case 'mathgame':
                return await this.handleMathGameResponse(from, messageText, game);
            case 'memorygame':
                return await this.handleMemoryGameResponse(from, messageText, game);
            case 'tictactoe':
                return await this.handleTicTacToeResponse(from, messageText, game);
            default:
                return false;
        }
    }

    async handleTriviaResponse(from, messageText, game) {
        const answer = messageText.toLowerCase().trim();
        const isCorrect = game.question.a.some(a => a === answer) || 
                         game.question.options.some((opt, idx) => (idx + 1).toString() === answer && game.question.a.includes(opt.toLowerCase()));

        this.activeGames.delete(from);

        if (isCorrect) {
            return await this.sock.sendMessage(from, {
                text: `🎉 *Correct!* Well done!\n\n*Answer:* ${game.question.options.find(opt => game.question.a.includes(opt.toLowerCase()))}`
            });
        } else {
            return await this.sock.sendMessage(from, {
                text: `❌ *Wrong answer!*\n\n*Correct answer:* ${game.question.options.find(opt => game.question.a.includes(opt.toLowerCase()))}`
            });
        }
    }

    async handleHangmanResponse(from, messageText, game) {
        const guess = messageText.toLowerCase().trim();
        
        if (guess === game.word) {
            this.activeGames.delete(from);
            return await this.sock.sendMessage(from, {
                text: `🎉 *Congratulations! You won!*\n\n*Word was:* ${game.word.toUpperCase()}`
            });
        }

        if (guess.length === 1) {
            if (game.guessedLetters.includes(guess)) {
                return await this.sock.sendMessage(from, {
                    text: `❌ *You already guessed '${guess}'*`
                });
            }

            game.guessedLetters.push(guess);

            if (game.word.includes(guess)) {
                // Update hidden word
                let newHiddenWord = '';
                for (let i = 0; i < game.word.length; i++) {
                    if (game.guessedLetters.includes(game.word[i])) {
                        newHiddenWord += game.word[i];
                    } else {
                        newHiddenWord += '_';
                    }
                }
                game.hiddenWord = newHiddenWord;

                if (!newHiddenWord.includes('_')) {
                    this.activeGames.delete(from);
                    return await this.sock.sendMessage(from, {
                        text: `🎉 *Congratulations! You won!*\n\n*Word was:* ${game.word.toUpperCase()}`
                    });
                }

                return await this.sock.sendMessage(from, {
                    text: `✅ *Good guess!*\n\n*Word:* \`${newHiddenWord}\`\n*Wrong Guesses:* ${game.wrongGuesses}/${game.maxWrongGuesses}\n*Guessed Letters:* ${game.guessedLetters.join(', ')}`
                });
            } else {
                game.wrongGuesses++;
                
                if (game.wrongGuesses >= game.maxWrongGuesses) {
                    this.activeGames.delete(from);
                    return await this.sock.sendMessage(from, {
                        text: `💀 *Game Over!*\n\n*The word was:* ${game.word.toUpperCase()}\n*Better luck next time!*`
                    });
                }

                return await this.sock.sendMessage(from, {
                    text: `❌ *Wrong letter!*\n\n*Word:* \`${game.hiddenWord}\`\n*Wrong Guesses:* ${game.wrongGuesses}/${game.maxWrongGuesses}\n*Guessed Letters:* ${game.guessedLetters.join(', ')}`
                });
            }
        }

        return false;
    }

    async handleQuizResponse(from, messageText, game) {
        const answer = messageText.toLowerCase().trim();

        if (answer === 'hint') {
            if (game.hintsUsed === 0) {
                game.hintsUsed++;
                return await this.sock.sendMessage(from, {
                    text: `💡 *Hint:* ${game.question.hint}`
                });
            } else {
                return await this.sock.sendMessage(from, {
                    text: `❌ *You already used your hint!*`
                });
            }
        }

        const isCorrect = game.question.a.some(a => answer.includes(a));
        this.activeGames.delete(from);

        if (isCorrect) {
            return await this.sock.sendMessage(from, {
                text: `🎉 *Correct!* Excellent!\n\n*Answer:* ${game.question.a[0].toUpperCase()}`
            });
        } else {
            return await this.sock.sendMessage(from, {
                text: `❌ *Wrong answer!*\n\n*Correct answer:* ${game.question.a[0].toUpperCase()}`
            });
        }
    }

    async handleMathGameResponse(from, messageText, game) {
        const userAnswer = parseInt(messageText.trim());
        this.activeGames.delete(from);

        if (userAnswer === game.answer) {
            return await this.sock.sendMessage(from, {
                text: `🎉 *Correct!* Great math skills!\n\n*${game.question} = ${game.answer}*`
            });
        } else {
            return await this.sock.sendMessage(from, {
                text: `❌ *Wrong answer!*\n\n*Correct answer:* ${game.question} = ${game.answer}`
            });
        }
    }

    async handleMemoryGameResponse(from, messageText, game) {
        if (game.phase !== 'guessing') return false;

        const userSequence = messageText.split(' ').map(num => parseInt(num.trim()));
        this.activeGames.delete(from);

        const isCorrect = userSequence.length === game.sequence.length && 
                         userSequence.every((num, index) => num === game.sequence[index]);

        if (isCorrect) {
            return await this.sock.sendMessage(from, {
                text: `🎉 *Amazing memory!* Perfect recall!\n\n*Sequence was:* ${game.sequence.join(' - ')}`
            });
        } else {
            return await this.sock.sendMessage(from, {
                text: `❌ *Wrong sequence!*\n\n*Your answer:* ${userSequence.join(' - ')}\n*Correct sequence:* ${game.sequence.join(' - ')}`
            });
        }
    }

    async handleTicTacToeResponse(from, messageText, game) {
        const position = parseInt(messageText.trim());
        
        if (isNaN(position) || position < 1 || position > 9) {
            return await this.sock.sendMessage(from, {
                text: `❌ *Invalid move!* Please enter a number between 1-9`
            });
        }

        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;

        if (game.board[row][col] !== ' ') {
            return await this.sock.sendMessage(from, {
                text: `❌ *Position already taken!* Choose another position`
            });
        }

        // Make the move
        const symbol = game.currentPlayer === game.player1 ? 'X' : 'O';
        game.board[row][col] = symbol;
        game.moves++;

        // Check for winner
        if (this.checkTicTacToeWinner(game.board, symbol)) {
            this.activeGames.delete(from);
            return await this.sock.sendMessage(from, {
                text: `🎉 *${symbol} WINS!*\n\n${this.displayTicTacToeBoard(game.board)}\n\n*Congratulations!*`
            });
        }

        // Check for draw
        if (game.moves === 9) {
            this.activeGames.delete(from);
            return await this.sock.sendMessage(from, {
                text: `🤝 *It's a Draw!*\n\n${this.displayTicTacToeBoard(game.board)}\n\n*Good game!*`
            });
        }

        // Switch players
        game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;

        return await this.sock.sendMessage(from, {
            text: `⭕ *TIC TAC TOE*\n\n${this.displayTicTacToeBoard(game.board)}\n\n*Current Player:* ${game.currentPlayer === game.player1 ? 'X' : 'O'}\n\n💡 *Next move: Type position (1-9)*`
        });
    }

    checkTicTacToeWinner(board, symbol) {
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (board[i][0] === symbol && board[i][1] === symbol && board[i][2] === symbol) {
                return true;
            }
        }

        // Check columns
        for (let i = 0; i < 3; i++) {
            if (board[0][i] === symbol && board[1][i] === symbol && board[2][i] === symbol) {
                return true;
            }
        }

        // Check diagonals
        if (board[0][0] === symbol && board[1][1] === symbol && board[2][2] === symbol) {
            return true;
        }
        if (board[0][2] === symbol && board[1][1] === symbol && board[2][0] === symbol) {
            return true;
        }

        return false;
    }

    clearExpiredGames() {
        const now = Date.now();
        const GAME_TIMEOUT = 5 * 60 * 1000; // 5 minutes

        for (const [chatId, game] of this.activeGames.entries()) {
            if (game.startTime && now - game.startTime > GAME_TIMEOUT) {
                this.activeGames.delete(chatId);
            }
        }
    }
}

export default GameManager;