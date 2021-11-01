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