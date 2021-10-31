
import * as Command from '../shared/protocol.js'

export class FutureSeer {
    constructor(client) {
        this.client = client
        this.solutionQueue = []
        this.variantQueue = []
        this.variantsCache = new Map()
        this.nextStepInfoCache = new Map()
        this.interrupted = false
        this.$data = {} // hack for client.sendRequest() compatibility
    }

    start() {
        this.variantsCache.clear()
        this.nextStepInfoCache.clear()
        this.solutionQueue = this.client.data.solutionWords.slice(0, 10)
        this.variantQueue = []
        this.interrupted = false
        console.log('Seer starting with queue:', this.solutionQueue)
        this.nextStep()
    }

    stop() {
        this.interrupted = true
        this.solutionQueue = []
        this.variantQueue = []
        this.resetCache()
    }

    getNextWordVariants() {
        const word = this.solutionQueue[0]
        this.variantQueue = this.client.getSolutionVariants(word)
        this.nextStep()

        // this.client.sendRequest(this, Command.GetSolutionVariants,
        //     {
        //         word: word,
        //     },
        //     function (seer, data) {
        //         console.log(`Seer cached ${data.variants.length} variants for word ${word}`)
        //         seer.variantsCache.set(word, data.variants)
        //         seer.variantQueue = data.variants
        //         seer.nextStep()
        //     }
        // )
    }

    getNextVariantInfo() {
        const word = this.solutionQueue[0]
        const variant = this.variantQueue[0]
        this.client.sendRequest(this, Command.GetNextStepInfo,
            {
                letter: variant.newLetter,
                cell: { x: variant.newLetterCell.x, y: variant.newLetterCell.y },
                word: word,
            },
            function(seer, data) {
                console.log(`Seer cached info for variant ${variant.hash()}`)
                seer.cacheInfo(variant, data)
                seer.variantQueue.shift()
                if (!seer.variantQueue.length)
                    seer.solutionQueue.shift()
                seer.nextStep()
            }
        )
    }

    nextStep() {
        if (this.interrupted) {
            console.log('Seer was interrupted.')
            return
        }

        if (this.variantQueue.length) {
            this.getNextVariantInfo()
        } else if (this.solutionQueue.length) {
            this.getNextWordVariants()
        } else {
            console.log('Seer has finished working.')
            return
        }        
    }

    getSolutionVariants(word) {
        return this.variantsCache.get(word)
    }

    cacheInfo(variant, info) {
        this.nextStepInfoCache.set(variant.hash(), info)
    }

    getInfo(variant) {
        const info = this.nextStepInfoCache.get(variant.hash())
        return info ? info : null
    }

    resetCache() {
        this.variantsCache.clear()
        this.nextStepInfoCache.clear()
    }
}