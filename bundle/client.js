(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Client = void 0;

var alphabet = _interopRequireWildcard(require("../shared/dictionary/alphabet.js"));

var Command = _interopRequireWildcard(require("../shared/protocol.js"));

var _game = require("../shared/game/game.js");

var _solution = require("../shared/game/solution.js");

var _seer = require("./seer.js");

var _itemFormatter = require("./vue/itemFormatter.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function clamp(min, x, max) {
  return Math.min(max, Math.max(x, min));
}

const serverUrl = 'http://localhost:3000';
const clientID = 'test';
const clientVersion = '1.0.0';
const PageStart = 'start';
const PageGame = 'game';

class Client {
  constructor() {
    this.id = clientID;
    this.data = {};
    this.view = null;
    this.solutions = [];
    this.seer = new _seer.FutureSeer(this);
    this.progressChecker = null;
    this.reset();
  }

  reset() {
    this.data = {
      client: this,
      isConnectedToServer: false,
      errorMessage: '',
      savedGameExists: false,
      profiles: [],
      selectedProfile: '',
      alphabet: new alphabet.Alphabet(alphabet.RussianID),
      game: new _game.Game(5),
      currentPage: PageStart,
      currentCell: {
        x: 0,
        y: 0
      },
      usedWordsList: [],
      solutionWords: [],
      solutionVariants: [],
      solutionVariantsNextSteps: [],
      waitingForServerResponse: false,
      solutionProgress: 0.0,
      usedWordsHeaderButtons: [{
        title: '➕',
        action: this.addUsedWordManually.bind(this)
      }],
      usedWordsItemButtons: [{
        title: '❌',
        action: this.addToBlacklist.bind(this)
      }, //{ title: '➖', action: this.removeUsedWord.bind(this) },
      {
        title: '➕',
        action: this.addToWhitelist.bind(this)
      }],
      solutionWordsItemButtons: [{
        title: '❌',
        action: this.addToBlacklist.bind(this)
      }],
      solutionVariantsItemButtons: [{
        title: '✔️',
        action: this.applyVariant.bind(this)
      }, {
        title: '❔',
        action: this.getNextStepInfo.bind(this),
        isVisible: function (variant) {
          return !this.hasNextStepInfo(variant);
        }.bind(this)
      }],
      solutionWordSelectionHandler: this.selectSolutionWord.bind(this),
      variantSelectionHandler: this.selectVariant.bind(this),
      wordItemFormatter: new _itemFormatter.WordItemFormatter(),
      solutionItemFormatter: new _itemFormatter.SolutionItemFormatter(),
      selectedSolutionWord: '',
      selectedVariant: null
    };
  }

  setupView() {
    this.view = new Vue({
      el: '#mainContainer',
      data: this.data,
      methods: {
        isSelectedCell: function (x, y) {
          return this.$data.currentCell.x == x && this.$data.currentCell.y == y;
        },
        isVariantCell: function (x, y) {
          const variant = this.$data.selectedVariant;
          return variant && variant.newLetterCell.x == x && variant.newLetterCell.y == y;
        },
        selectCell: function (x, y) {
          this.$data.currentCell = {
            x: x,
            y: y
          };
        },
        getCellValue: function (x, y) {
          const variant = this.$data.selectedVariant;

          if (variant && x == variant.newLetterCell.x && y == variant.newLetterCell.y) {
            return variant.newLetter.toUpperCase();
          }

          const value = this.$data.game.field.get(x, y);
          return value != alphabet.EmptySymbol ? value.toUpperCase() : ' ';
        },
        startNewGame: function () {
          this.$data.client.startNewGame();
        },
        loadGame: function () {
          this.$data.client.loadGame();
        },
        exitGame: function () {
          this.$data.client.exitGame();
        },
        solve: function () {
          this.$data.solutionWords = [];
          this.$data.client.solve();
          this.$data.client.resetSolutionSelection();
        }
      }
    });
  }

  sayHello() {
    this.sendRequest(this, Command.Hello, {
      version: clientVersion
    }, function (client, data) {
      console.log(`Server version: ${data.version} (game exists = ${data.gameExists})`);
      client.data.savedGameExists = data.gameExists;
      const serverVersion = data.version;
      if (serverVersion != clientVersion) console.warn(`Client version ${clientVersion} differs from server version ${serverVersion}! This might be a problem.`);
    });
  }

  getProfiles() {
    this.sendRequest(this, Command.GetProfiles, {}, function (client, data) {
      client.data.profiles = data.profiles;
      if (data.profiles.length) client.data.selectedProfile = data.profiles[0];
      console.log(`Profiles:`, data.profiles);
    });
  }

  startNewGame() {
    const word = prompt('Enter initial word:', 'жмудь');

    if (!word || word.length != 5) {
      alert('You need to enter a word that is 5 letters long!');
      return;
    }

    this.sendRequest(this, Command.StartGame, {
      profile: this.data.selectedProfile,
      initialWord: word,
      fieldSize: 5
    }, function (client, data) {
      console.log(`Game started!`);
      client.data.alphabet.load(data.alphabet);
      client.data.game.load(data.game);
      client.data.usedWordsList = client.data.game.usedWordsList();
      client.resetSolutions();
      client.seer.stop();
      client.data.currentPage = PageGame;
    });
  }

  loadGame() {
    this.sendRequest(this, Command.LoadGame, {}, function (client, data) {
      console.log(`Game loaded!`);
      client.data.alphabet.load(data.alphabet);
      client.data.game.load(data.game);
      client.data.usedWordsList = client.data.game.usedWordsList();
      client.resetSolutions();
      client.seer.stop();
      client.data.currentPage = PageGame;
    });
  }

  exitGame() {
    if (!confirm('Do you REALLY want to EXIT the game?')) return;
    this.sendRequest(this, Command.ExitGame, {
      saveGame: true
    }, function (client, data) {
      console.log(`Game exited!`);
      client.data.game.reset();
      client.data.usedWordsList = [];
      client.resetSolutions();
      client.seer.stop();
      client.data.currentPage = PageStart;
    });
  }

  resetSolutionSelection() {
    this.data.selectedSolutionWord = null;
    this.view.$refs.solutions.resetSelection();
    this.resetVariants();
  }

  resetVariantSelection() {
    this.data.selectedVariant = null;
    this.view.$refs.variants.resetSelection();
  }

  resetSolutions() {
    this.resetVariants();
    this.resetSolutionSelection();
    this.data.solutionWords = [];
    this.solutions = [];
  }

  resetVariants() {
    this.resetVariantSelection();
    this.data.solutionVariants = [];
    this.data.solutionVariantsNextSteps = [];
  }

  updateFieldViewHack() {
    // dirty hack to update view cell value
    let old = this.data.currentCell;
    this.data.currentCell = {
      x: 0,
      y: 0
    };
    this.data.currentCell = old;
  }

  moveSelection(xDelta, yDelta) {
    const newX = clamp(0, this.data.currentCell.x + xDelta, this.data.game.field.size - 1);
    const newY = clamp(0, this.data.currentCell.y + yDelta, this.data.game.field.size - 1);
    this.data.currentCell = {
      x: newX,
      y: newY
    };
  }

  setFieldLetter(letter) {
    this.resetVariantSelection();
    this.seer.stop();
    this.data.game.field.set(this.data.currentCell.x, this.data.currentCell.y, letter);
    this.updateFieldViewHack();
    this.sendRequest(this, Command.SetLetter, {
      cell: this.data.currentCell,
      letter: letter
    }, function (client, data) {
      console.log('Letter set!');
    });
  }

  solve() {
    this.seer.stop();
    this.data.solutionProgress = 0.0;
    this.updateChecker = setInterval(this.updateProgress.bind(this), 500);
    this.sendRequest(this, Command.Solve, {}, function (client, data) {
      console.log(`Solved!`);
      clearInterval(client.updateChecker);
      client.data.solutionProgress = 1.0;
      client.data.solutionWords = data.words.slice(0, 30);
      client.solutions = data.solutions.map(solutionData => {
        let solution = new _solution.Solution();
        solution.load(solutionData);
        return solution;
      });
      client.seer.start();
    });
  }

  addUsedWordManually() {
    const word = prompt('Add used word:', '');
    if (!word) return;

    if (!this.data.alphabet.containsWord(word)) {
      alert(`Invalid word: ${word}`);
      return;
    }

    if (this.data.solutionWords.includes(word)) {
      this.data.solutionWords.splice(this.data.solutionWords.indexOf(word), 1);
      this.resetSolutionSelection();
    }

    this.sendRequest(this, Command.AddUsedWord, {
      word: word
    }, function (client, data) {
      client.data.game.load(data.game);
      client.data.usedWordsList = client.data.game.usedWordsList();
    });
  }

  removeUsedWord(word) {
    const index = this.data.usedWordsList.indexOf(word);
    if (index >= 0) this.data.usedWordsList.splice(index, 1);
  }

  addToWhitelist(word) {
    this.sendRequest(this, Command.AddToWhitelist, {
      word: word
    }, function (client, data) {});
  }

  addToBlacklist(word) {
    this.sendRequest(this, Command.AddToBlacklist, {
      word: word
    }, function (client, data) {
      const solutionIndex = client.data.solutionWords.indexOf(word);

      if (solutionIndex >= 0) {
        client.resetSolutionSelection();
        client.data.solutionWords.splice(solutionIndex, 1);
      }

      const usedWordsIndex = client.data.usedWordsList.indexOf(word);
      if (usedWordsIndex >= 0) client.data.usedWordsList.splice(usedWordsIndex, 1);
    });
  }

  selectSolutionWord(word) {
    this.data.selectedSolutionWord = word;
    this.data.solutionVariants = this.getSolutionVariants(word);

    if (this.data.solutionVariants.length > 0) {
      const firstVariant = this.data.solutionVariants[0];
      this.view.$refs.variants.selectItem(firstVariant);
      this.data.selectedVariant = firstVariant;
    }
  }

  selectVariant(variant) {
    console.log(`selectVariant ${variant.hash()}`);
    this.data.selectedVariant = variant;
  }

  applyVariant(variant) {
    const word = this.view.$refs.solutions.$data.selectedItem;
    this.sendRequest(this, Command.AddWord, {
      letter: variant.newLetter,
      cell: {
        x: variant.newLetterCell.x,
        y: variant.newLetterCell.y
      },
      word: word
    }, function (client, data) {
      client.data.game.load(data.game);
      client.data.usedWordsList = client.data.game.usedWordsList();
      client.resetSolutions();
      client.seer.stop();
    });
  }

  updateProgress() {
    this.sendRequest(this, Command.GetProgressStatus, {}, function (client, data) {
      client.view.$data.solutionProgress = parseFloat(data.progress);
      console.log('Update progress...', client.data.solutionProgress.toFixed(2));
    });
  }

  getSolutionVariants(word) {
    return this.solutions.filter(solution => solution.words.includes(word));
  }

  hasNextStepInfo(variant) {
    return !!variant.nextStepInfo || !!this.seer.getInfo(variant);
  }

  getNextStepInfo(variant) {
    if (!!variant.nextStepInfo) return variant.nextStepInfo;
    const cachedInfo = this.seer.getInfo(variant);

    if (cachedInfo) {
      variant.nextStepInfo = cachedInfo;
      return cachedInfo;
    }

    const word = this.view.$refs.solutions.$data.selectedItem;
    this.sendRequest(this, Command.GetNextStepInfo, {
      letter: variant.newLetter,
      cell: {
        x: variant.newLetterCell.x,
        y: variant.newLetterCell.y
      },
      word: word
    }, function (client, data) {
      variant.nextStepInfo = data;
      client.seer.cacheInfo(variant, data);
    });
  }

  sendRequest(client, command, data, callback) {
    let isLongCommand = command => command == Command.Solve;

    console.log(`send request: ${command}`, data);
    if (isLongCommand(command)) client.data.waitingForServerResponse = true;
    $.get(serverUrl, {
      id: this.id,
      command: command,
      data: data
    }, function (rawData) {
      if (isLongCommand(command)) client.data.waitingForServerResponse = false;
      client.data.isConnectedToServer = true;
      const data = JSON.parse(rawData);

      if (!data) {
        console.error(`Invalid server response:`, data);
        return;
      }

      if (data.status != "ok") {
        console.error(`Server responded with an error: ${data.error}`);
        return;
      }

      console.log(`Server response:`, data);
      callback(client, data.data);
    }).catch(function (error) {
      console.error(`Request error:`, error);
      client.data.waitingForServerResponse = false;
      client.data.isConnectedToServer = false;
      client.data.errorMessage = 'Server connection lost';
    });
  }

  handleKeyboardEvent(event) {
    //console.log(`handleKeyboardEvent`, this.data.currentPage, event)
    if (this.data.currentPage != PageGame) return;
    event = event || window.event;
    console.log(`${event.key} ${event.code} pressed`);

    if (this.data.alphabet.containsLetter(event.key)) {
      this.setFieldLetter(event.key);
    } else if (event.code == 'Space' || event.code == 'Backspace' || event.code == 'Delete') {
      this.setFieldLetter(alphabet.EmptySymbol);
    } else if (event.code == 'ArrowLeft') {
      this.moveSelection(0, -1);
    } else if (event.code == 'ArrowRight') {
      this.moveSelection(0, 1);
    } else if (event.code == 'ArrowUp') {
      this.moveSelection(-1, 0);
    } else if (event.code == 'ArrowDown') {
      this.moveSelection(1, 0);
    } else if (event.code == 'Enter') {
      this.solve();
    }
  }

}

exports.Client = Client;

},{"../shared/dictionary/alphabet.js":8,"../shared/game/game.js":11,"../shared/game/solution.js":12,"../shared/protocol.js":13,"./seer.js":3,"./vue/itemFormatter.js":4}],2:[function(require,module,exports){
"use strict";

require("./vue/wordList.js");

require("./vue/wordListItem.js");

require("./vue/wordListItemButton.js");

var _client = require("./client.js");

let client = new _client.Client();
document.onkeydown = client.handleKeyboardEvent.bind(client);
client.setupView();
client.sayHello();
client.getProfiles();

},{"./client.js":1,"./vue/wordList.js":5,"./vue/wordListItem.js":6,"./vue/wordListItemButton.js":7}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FutureSeer = void 0;

var Command = _interopRequireWildcard(require("../shared/protocol.js"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

class FutureSeer {
  constructor(client) {
    this.client = client;
    this.solutionQueue = [];
    this.variantQueue = [];
    this.variantsCache = new Map();
    this.nextStepInfoCache = new Map();
    this.interrupted = false;
    this.data = {}; // hack for client.sendRequest() compatibility
  }

  start() {
    this.variantsCache.clear();
    this.nextStepInfoCache.clear();
    this.solutionQueue = this.client.data.solutionWords.slice(0, 10);
    this.variantQueue = [];
    this.interrupted = false;
    console.log('Seer starting with queue:', this.solutionQueue);
    this.nextStep();
  }

  stop() {
    this.interrupted = true;
    this.solutionQueue = [];
    this.variantQueue = [];
    this.resetCache();
  }

  getNextWordVariants() {
    const word = this.solutionQueue[0];
    this.variantQueue = this.client.getSolutionVariants(word);
    this.nextStep();
  }

  getNextVariantInfo() {
    const word = this.solutionQueue[0];
    const variant = this.variantQueue[0];
    this.client.sendRequest(this, Command.GetNextStepInfo, {
      letter: variant.newLetter,
      cell: {
        x: variant.newLetterCell.x,
        y: variant.newLetterCell.y
      },
      word: word
    }, function (seer, data) {
      console.log(`Seer cached info for variant ${variant.hash()}`);
      seer.cacheInfo(variant, data);
      variant.nextStepInfo = data;
      seer.variantQueue.shift();
      if (!seer.variantQueue.length) seer.solutionQueue.shift();
      seer.nextStep();
    });
  }

  nextStep() {
    if (this.interrupted) {
      console.log('Seer was interrupted.');
      return;
    }

    if (this.variantQueue.length) {
      this.getNextVariantInfo();
    } else if (this.solutionQueue.length) {
      this.getNextWordVariants();
    } else {
      console.log('Seer has finished working.');
      return;
    }
  }

  getSolutionVariants(word) {
    return this.variantsCache.get(word);
  }

  cacheInfo(variant, info) {
    this.nextStepInfoCache.set(variant.hash(), info);
  }

  getInfo(variant) {
    const info = this.nextStepInfoCache.get(variant.hash());
    return info ? info : null;
  }

  resetCache() {
    this.variantsCache.clear();
    this.nextStepInfoCache.clear();
  }

}

exports.FutureSeer = FutureSeer;

},{"../shared/protocol.js":13}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WordItemFormatter = exports.SolutionItemFormatter = void 0;

class WordItemFormatter {
  constructor() {}

  itemKey(item) {
    return item;
  }

  itemText(item) {
    return `${item.toUpperCase()} ${item.length}`;
  }

  itemHint(item) {
    return '';
  }

}

exports.WordItemFormatter = WordItemFormatter;

class SolutionItemFormatter {
  constructor() {}

  itemKey(item) {
    return item.hash();
  }

  itemText(item) {
    return `${item.newLetter.toUpperCase()} (${item.newLetterCell.x}:${item.newLetterCell.y}) ${this.nextStepShortDescription(item)}`;
  }

  itemHint(item) {
    return this.nextStepLongDescription(item);
  }

  nextStepShortDescription(item) {
    if (!item.nextStepInfo) return '';
    const maxWordLength = item.nextStepInfo.maxWordLength;
    const indicator = item.words[0].length < maxWordLength ? '‼️' : item.words[0].length > maxWordLength ? '💲' : '';
    const longestWordsCount = item.nextStepInfo.longestWords.filter(word => word.length == maxWordLength).length;
    return `${maxWordLength} (${longestWordsCount}) ${indicator}`;
  }

  nextStepLongDescription(item) {
    if (!item.nextStepInfo) return '';
    return `${item.nextStepInfo.longestWords.join(', ')}`;
  }

}

exports.SolutionItemFormatter = SolutionItemFormatter;

},{}],5:[function(require,module,exports){
"use strict"

const NoIndex = -1

function updateChildrenSelection(view, selectedItem) {
    view.$children
        .filter(c => c.$options.name === 'word-list-item')
        .forEach(c => c.$data.isSelected = c.$props.item === selectedItem)
}

Vue.component('word-list', {
    data: function() {
        return {
            selectedIndex: NoIndex,
            selectedItem: null,
        }
    },
    props: [
        'title',
        'headerButtons',
        'itemButtons',
        'items',
        'itemFormatter',
        'itemSelectedHandler',
    ],
    methods: {
        onItemSelected: function(item) {
            this.$data.selectedIndex = this.$props.items.indexOf(item)
            this.$data.selectedItem = item
            updateChildrenSelection(this, item)
            
            if (this.$props.itemSelectedHandler)
                this.$props.itemSelectedHandler(item)
        },
        selectItem: function(item) {
            this.$nextTick(function () {
                this.$data.selectedIndex = this.$props.items.indexOf(item)
                this.$data.selectedItem = item
                updateChildrenSelection(this, item)
              })
        },
        resetSelection: function() {
            this.$data.selectedIndex = NoIndex
            this.$data.selectedItem = null
            updateChildrenSelection(this, null)
        },
    },
    template: `
    <div>
        <div class="wordListHeader">
            <span v-show="!!title">{{ title }}</span>
            <word-list-item-button
                v-for="button in headerButtons"
                v-bind:key="button.title"
                v-bind:button-item="button"
            >
            </word-list-item-button>
        </div>
        <div
            class="wordList"
        >
            <word-list-item
                v-for="item in items"
                v-bind:key="itemFormatter.itemKey(item)"
                v-bind:item="item"
                v-bind:buttons="itemButtons"
                v-on:clicked="onItemSelected(item)"
            >
                <span
                    class="itemDescriptionText"
                    v-bind:title="itemFormatter.itemHint(item)"
                >
                    {{ itemFormatter.itemText(item) }}
                </span>
            </word-list-item>
        </div>
    </div>
    `
})
},{}],6:[function(require,module,exports){

Vue.component('word-list-item', {
    data: function() {
        return {
            isHovered: false,
            isSelected: false,
        }
    },
    props: [
        'item',
        'buttons',
    ],
    methods: {
        onHoverChanged: function(isHovered) {
            this.$data.isHovered = isHovered
        },
        onClicked: function() {
            this.$emit('clicked')
        },
        isButtonVisible: function(button) {
            return true
                && (this.$data.isHovered || this.$data.isSelected)
                && (button.isVisible ? button.isVisible(this.$props.item) : true)
        },
    },
    template: `
    <div
        class="wordListItem"
        v-bind:isSelected="isSelected"
        @mouseover="onHoverChanged(true)"
        @mouseleave="onHoverChanged(false)"
        v-on:click="onClicked"
    >
        <slot></slot>
        <word-list-item-button
            v-for="button in buttons"
            v-bind:key="button.title"
            v-bind:item="item"
            v-bind:button-item="button"
            v-show="isButtonVisible(button)"
        >
        </word-list-item-button>
    </div>
    `
})
},{}],7:[function(require,module,exports){

Vue.component('word-list-item-button', {
    data: function() {
        return {
        }
    },
    props: [
        'item',
        'buttonItem',
    ],
    methods: {
        onClicked: function() {
            const action = this.$props.buttonItem.action
            if (action)
                action(this.$props.item)
        },
    },
    template: `
    <button
        class="wordListItemButton"
        v-on:click="onClicked"
    >{{ buttonItem.title }}</button>
    `
})

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RussianID = exports.EnglishID = exports.EmptySymbol = exports.Alphabet = void 0;

var utils = _interopRequireWildcard(require("../../utils.js"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const EmptySymbol = ".";
exports.EmptySymbol = EmptySymbol;
const russianLetters = 'абвгдежзийклмнопрстуфхцчшщьыъэюя';
const englishLetters = 'abcdefghijklmnopqrstuvwxyz';
const RussianID = 'russian';
exports.RussianID = RussianID;
const EnglishID = 'english';
exports.EnglishID = EnglishID;
const alphabetLetters = {
  [RussianID]: russianLetters,
  [EnglishID]: englishLetters
};

function getAlphabetLetters(id) {
  if (!alphabetLetters.hasOwnProperty(id)) throw new Error(`Unknown alphabet: ${id}`);
  return alphabetLetters[id];
}

class Alphabet {
  constructor(id) {
    this.id = id;
    this.letters = utils.lettersOf(getAlphabetLetters(id));
  }

  containsLetter(letter) {
    return this.letters.includes(letter);
  }

  containsWord(word) {
    const letters = Array.isArray(word) ? word : utils.lettersOf(word);
    return letters.every(letter => this.containsLetter(letter));
  }

  save() {
    return this.id;
  }

  load(data) {
    this.id = data;
    this.letters = utils.lettersOf(getAlphabetLetters(this.id));
  }

}

exports.Alphabet = Alphabet;

},{"../../utils.js":14}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GameProtocolError = exports.GameLogicError = void 0;

class GameLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GameLogicError';
  }

}

exports.GameLogicError = GameLogicError;

class GameProtocolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GameProtocolError';
  }

}

exports.GameProtocolError = GameProtocolError;

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Field = void 0;

var utils = _interopRequireWildcard(require("../../utils.js"));

var alphabet = _interopRequireWildcard(require("../dictionary/alphabet.js"));

var _error = require("../error.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function validateFieldSize(size) {
  if (!Number.isInteger(size) || size < 0 || size % 2 == 0) throw new _error.GameLogicError(`Invalid field size: ${size}`);
}

class Field {
  constructor() {
    this.size = 0;
    this.cells = [];
  }

  cloneFrom(other) {
    this.size = other.size;
    this.cells = other.cells.slice(0);
  }

  reset(size, value = alphabet.EmptySymbol) {
    validateFieldSize(size);
    this.size = size;
    this.cells = new Array(size * size).fill(value);
  }

  get(x, y) {
    return this.cells[x + this.size * y];
  }

  set(x, y, value) {
    this.cells[x + this.size * y] = value;
  }

  isInside(x, y) {
    return true && x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  adjacentCells(x, y) {
    let result = [];
    if (x - 1 >= 0) result.push({
      x: x - 1,
      y: y
    });
    if (x + 1 < this.size) result.push({
      x: x + 1,
      y: y
    });
    if (y - 1 >= 0) result.push({
      x: x,
      y: y - 1
    });
    if (y + 1 < this.size) result.push({
      x: x,
      y: y + 1
    });
    return result;
  }

  forEachCell(func) {
    for (let i = 0; i < this.size; ++i) for (let j = 0; j < this.size; ++j) func(this.get(i, j), i, j);
  }

  forEachAdjacentCell(x, y, func) {
    this.adjacentCells(x, y).forEach(cell => func(this.get(cell.x, cell.y), cell.x, cell.y));
  }

  toString() {
    let result = "";

    for (let i = 0; i < this.size; ++i) {
      for (let j = 0; j < this.size; ++j) {
        const symbol = this.get(i, j);
        result += symbol == alphabet.EmptySymbol ? "." : symbol;
      }

      result += "\n";
    }

    return result;
  }

  toStringArray() {
    let strings = [];

    for (let i = 0; i < this.size; ++i) {
      let buffer = "";

      for (let j = 0; j < this.size; ++j) buffer += this.get(i, j);

      strings.push(buffer);
    }

    return strings;
  }

  fromStringArray(strings) {
    if (!Array.isArray(strings) || strings.some(s => typeof s != 'string')) throw (0, _error.GameLogicError)(`fromStringArray: ${strings} should be an array of strings`);
    validateFieldSize(strings.length);
    this.size = strings.length;
    this.reset(this.size, alphabet.EmptySymbol);

    for (let i = 0; i < this.size; ++i) {
      const letters = utils.lettersOf(strings[i]);
      if (letters.length != this.size) throw (0, _error.GameLogicError)(`fromStringArray: Invalid string ${strings[i]}`);

      for (let j = 0; j < this.size; ++j) {
        this.set(i, j, letters[j]);
      }
    }
  }

  save() {
    return this.toStringArray();
  }

  load(data) {
    this.fromStringArray(data);
  }

  hash() {
    return this.toStringArray().join("");
  }

}

exports.Field = Field;

},{"../../utils.js":14,"../dictionary/alphabet.js":8,"../error.js":9}],11:[function(require,module,exports){
"use strict"; //import _ from 'lodash-es'

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Game = void 0;

var utils = _interopRequireWildcard(require("../../utils.js"));

var alphabet = _interopRequireWildcard(require("../dictionary/alphabet.js"));

var _field = require("./field.js");

var _error = require("../error.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

class Game {
  constructor(fieldSize) {
    if (!Number.isInteger(fieldSize) || fieldSize < 0 || fieldSize % 2 == 0) throw new _error.GameLogicError(`Invalid game field size: ${fieldSize}. Should be a positive odd integer.`);
    this.field = new _field.Field();
    this.field.reset(fieldSize);
    this.usedWords = new Set();
    this.letterCount = 0;
  }

  setInitialWord(word) {
    if (typeof word != 'string' || word.length != this.field.size) throw new _error.GameLogicError(`Initial word ${word} doesn't fit the field!`);
    const middleRow = Math.floor(this.field.size / 2);

    for (let i = 0; i < this.field.size; ++i) this.field.set(middleRow, i, utils.letter(word, i));

    this.letterCount = this.field.size;
    this.addUsedWord(word);
  }

  setLetter(x, y, letter) {
    this.field.set(x, y, letter);
    this.updateLetterCount();
  }

  addUsedWord(word) {
    this.usedWords.add(word);
  }

  usedWordsList() {
    return Array.from(this.usedWords.values());
  }

  updateLetterCount() {
    this.letterCount = 0;
    this.field.forEachCell(value => {
      if (value != alphabet.EmptySymbol) this.letterCount++;
    });
  }

  isWordUsed(word) {
    return this.usedWords.has(word);
  }

  reset() {
    this.usedWords.clear();
    this.letterCount = 0;
    this.field.reset(this.field.size);
  }

  save() {
    return {
      field: this.field.save(),
      words: this.usedWordsList()
    };
  }

  load(data) {
    if (!data || !data.hasOwnProperty('field') || !data.hasOwnProperty('words')) throw new Error('Game: invalid load data:', data);
    this.field.load(data.field);
    this.usedWords = new Set(data.words);
    this.updateLetterCount();
  }

}

exports.Game = Game;

},{"../../utils.js":14,"../dictionary/alphabet.js":8,"../error.js":9,"./field.js":10}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Solution = void 0;

var utils = _interopRequireWildcard(require("../../utils.js"));

var alphabet = _interopRequireWildcard(require("../dictionary/alphabet.js"));

var _field = require("./field.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

class Solution {
  constructor() {
    this.field = new _field.Field();
    this.newLetterCell = {
      x: 0,
      y: 0
    };
    this.newLetter = alphabet.EmptySymbol;
    this.words = [];
  }

  addWord(word, cell, letter) {
    let i = 0;

    for (; i < this.words.length; ++i) {
      const w = this.words[i];
      if (word == w) return;else if (word.length >= w.length) break;
    }

    this.words.splice(i, 0, word);
  }

  bestWord() {
    return this.words.length ? this.words[0] : "";
  }

  compare(other) {
    if (this.bestWord().length > other.bestWord().length) return -1;
    return other.words.length - this.words.length;
  }

  toString() {
    let buffer = "";
    buffer += this.field.toString();
    this.words.forEach(word => buffer += `${word} ${word.length}\n`);
    return buffer;
  }

  hash() {
    return `${this.newLetter} ${this.newLetterCell.x}:${this.newLetterCell.y}`;
  }

  save() {
    return {
      letter: this.newLetter,
      cell: this.newLetterCell,
      words: this.words //field: this.field.save(),

    };
  }

  load(data) {
    this.newLetter = data.letter;
    this.newLetterCell = {
      x: parseInt(data.cell.x),
      y: parseInt(data.cell.y)
    };
    this.words = data.words; //this.field.load(data.field)
  }

}

exports.Solution = Solution;

},{"../../utils.js":14,"../dictionary/alphabet.js":8,"./field.js":10}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StartGame = exports.Solve = exports.SetLetter = exports.LoadGame = exports.Hello = exports.GetSolutionVariants = exports.GetProgressStatus = exports.GetProfiles = exports.GetNextStepInfo = exports.ExitGame = exports.AddWord = exports.AddUsedWord = exports.AddToWhitelist = exports.AddToBlacklist = void 0;
const Hello = "Hello";
exports.Hello = Hello;
const GetProfiles = "GetProfiles";
exports.GetProfiles = GetProfiles;
const StartGame = "StartGame";
exports.StartGame = StartGame;
const LoadGame = "LoadGame";
exports.LoadGame = LoadGame;
const ExitGame = "ExitGame";
exports.ExitGame = ExitGame;
const Solve = "Solve";
exports.Solve = Solve;
const GetProgressStatus = "GetProgressStatus";
exports.GetProgressStatus = GetProgressStatus;
const GetSolutionVariants = "GetSolutionVariants";
exports.GetSolutionVariants = GetSolutionVariants;
const SetLetter = "SetLetter";
exports.SetLetter = SetLetter;
const AddWord = "AddWord";
exports.AddWord = AddWord;
const AddUsedWord = "AddUsedWord";
exports.AddUsedWord = AddUsedWord;
const GetNextStepInfo = "GetNextStepInfo";
exports.GetNextStepInfo = GetNextStepInfo;
const AddToBlacklist = "AddToBlacklist";
exports.AddToBlacklist = AddToBlacklist;
const AddToWhitelist = "AddToWhitelist";
exports.AddToWhitelist = AddToWhitelist;

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepFreeze = deepFreeze;
exports.forEachLetter = forEachLetter;
exports.getProperty = getProperty;
exports.getRequiredProperty = getRequiredProperty;
exports.letter = letter;
exports.lettersOf = lettersOf;
exports.localeCompare = localeCompare;
exports.longStringsFirstComparator = longStringsFirstComparator;

function localeCompare(a, b) {
  if (!a) return -1;
  return a.localeCompare(b);
}

function getProperty(data, property, defaultValue) {
  return data.hasOwnProperty(property) ? data[property] : defaultValue;
}

function getRequiredProperty(data, property) {
  if (!data.hasOwnProperty(property)) throw new Error(`Missing required property ${property} of object ${data}!`);
  return data[property];
}

function deepFreeze(obj) {
  let propNames = Object.getOwnPropertyNames(obj);
  propNames.forEach(function (name) {
    let prop = obj[name];
    if (typeof prop == 'object' && prop !== null) deepFreeze(prop);
  });
  return Object.freeze(obj);
}

function forEachLetter(word, callback) {
  for (let i = 0; i < word.length; ++i) callback(word.slice(i, i + 1), i);
}

function letter(word, index) {
  return word.slice(index, index + 1);
}

function lettersOf(word) {
  let result = [];
  forEachLetter(word, letter => result.push(letter));
  return result;
}

function longStringsFirstComparator(a, b) {
  if (a.length > b.length) {
    return -1;
  } else if (a.length == b.length) {
    return a == b ? 0 : a < b ? -1 : 1;
  } else {
    return 1;
  }
}

},{}]},{},[2]);
