
export class WordItemFormatter {
    constructor() {
    }

    itemKey(item) {
        return item
    }

    itemText(item) {
        return `${item.toUpperCase()} ${item.length}`
    }

    itemHint(item) {
        return ''
    }
}

export class SolutionItemFormatter {
    constructor() {
    }

    itemKey(item) {
        return item.hash()
    }

    itemText(item) {
        return `${item.newLetter.toUpperCase()} (${item.newLetterCell.x}:${item.newLetterCell.y}) ${this.nextStepShortDescription(item)}`
    }

    itemHint(item) {
        return this.nextStepLongDescription(item)
    }

    nextStepShortDescription(item) {
        if (!item.nextStepInfo)
            return ''

        const maxWordLength = item.nextStepInfo.maxWordLength
        const longestWordsCount = item.nextStepInfo.longestWords.filter(word => word.length == maxWordLength).length
        return `Next: ${maxWordLength} (${longestWordsCount})`
    }

    nextStepLongDescription(item) {
        if (!item.nextStepInfo)
            return ''
        
        return `${item.nextStepInfo.longestWords.join(', ')}`
    }
}