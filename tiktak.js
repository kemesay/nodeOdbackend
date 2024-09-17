const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const board = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9']
];

let currentPlayer = 'X';

const printBoard = () => {
  console.log('\n');
  board.forEach(row => {
    console.log(row.join(' | '));
    console.log('---------');
  });
  console.log('\n');
};

const checkWin = () => {
  // Check rows
  for (let row of board) {
    if (row.every(cell => cell === currentPlayer)) return true;
  }

  // Check columns
  for (let col = 0; col < 3; col++) {
    if (board.every(row => row[col] === currentPlayer)) return true;
  }

  // Check diagonals
  if (board[0][0] === currentPlayer && board[1][1] === currentPlayer && board[2][2] === currentPlayer) return true;
  if (board[0][2] === currentPlayer && board[1][1] === currentPlayer && board[2][0] === currentPlayer) return true;

  return false;
};

const checkTie = () => {
  return board.flat().every(cell => cell === 'X' || cell === 'O');
};

const makeMove = (position) => {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === position) {
        board[i][j] = currentPlayer;
        return true;
      }
    }
  }
  return false;
};

const nextTurn = () => {
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
};

const play = () => {
  printBoard();
  rl.question(`Player ${currentPlayer}, enter your move (1-9): `, (input) => {
    if (makeMove(input)) {
      if (checkWin()) {
        printBoard();
        console.log(`Player ${currentPlayer} wins!`);
        rl.close();
        return;
      }
      if (checkTie()) {
        printBoard();
        console.log('The game is a tie!');
        rl.close();
        return;
      }
      nextTurn();
    } else {
      console.log('Invalid move, try again.');
    }
    play();
  });
};

play();
