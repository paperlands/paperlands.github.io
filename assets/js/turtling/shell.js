// TurtleMonad class for managing state and commands'
//
import Turtle from './turtle.js';
import {parseProgram } from "./parse.js"

// UI setup
const canvas = document.getElementById('canvas');
const output = document.getElementById('output');

const turtle = new Turtle(canvas);
const cachedVal = loadEditorContent()

runCode(cachedVal, turtle, canvas)
const editor = document.getElementById('editor');

let shell = CodeMirror.fromTextArea(editor, {theme: "abbott",
                                               mode: "apl",
                                             lineNumbers: true,
                                             styleActiveLine: true,
                                             autocorrect: true,
                                             extraKeys: {
                                                 "Ctrl-Space": function() {
      snippet()
    }}});

 const snippets = [
    { text: 'fw 1', displayText: 'go forward 1 unit' },
    { text: 'hd', displayText: 'hide turtle' },
    { text: 'jmp 1', displayText: 'jump by 1 unit' },
     { text: 'rt 90', displayText: 'turn right angle 90' },
     { text: 'lt 90', displayText: 'turn left angle 90 ' },
     { text: 'for 2 ()', displayText: 'repeat twice' },
  ];

  function snippet() {
    CodeMirror.showHint(shell, function () {
      const cursor = shell.getCursor();
      const token = shell.getTokenAt(cursor);
      const start = token.start;
      const end = cursor.ch;
      const line = cursor.line;
      const currentWord = token.string;

      const list = snippets.filter(function (item) {
        return item.text.indexOf(currentWord) >= 0;
      });

      return {
        list: list.length ? list : snippets,
        from: CodeMirror.Pos(line, start),
        to: CodeMirror.Pos(line, end)
      };
    }, { completeSingle: true });
  }

function runCode(code, turtle, canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    try {
        const commands = parseProgram(code);
        turtle.draw(commands)

        // Display output
        output.innerHTML = `${turtle.commandCount}`;
    } catch (error) {
        output.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Set up event listeners
const debouncedRunCode = debounce(runCode, 180);

shell.setValue(loadEditorContent());

function saveEditorContent(val) {
  localStorage.setItem('@my.turtle', val);
}

function loadEditorContent() {
    return localStorage.getItem('@my.turtle') || `
draw hexagram curr prev do
for 6 do
  # triangles
  for 3 do
    fw curr
    rt 120
  end
  rt 60
  fw curr
  end
  rt 60
  wait 0.1
  jmp curr+prev/curr
  hexagram curr+prev/curr curr
end
hexagram 100 100

`
}


shell.on('change', function(cm, change) {
    const val = cm.getValue()
    saveEditorContent(val);
  debouncedRunCode(val, turtle, canvas)
})
