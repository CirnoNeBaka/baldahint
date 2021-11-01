
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
