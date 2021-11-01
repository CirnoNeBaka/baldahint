
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