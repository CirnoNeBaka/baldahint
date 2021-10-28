"use strict"

function deepFreeze(obj) {
    let propNames = Object.getOwnPropertyNames(obj)

    propNames.forEach(function(name) {
        let prop = obj[name]

        if (typeof prop == 'object' && prop !== null)
        deepFreeze(prop)
    })

    return Object.freeze(obj)
}

function forEachLetter(word, callback) {
    for (let i = 0; i < word.length; ++i)
        callback(word.slice(i, i+1), i)
}

function letter(word, index) {
    return word.slice(index, index + 1)
}

function lettersOf(word) {
    let result = []
    forEachLetter(word, letter => result.push(letter))
    return result
}

function longStringsFirstComparator(a, b) {
    if (a.length > b.length)
    {
        return -1
    }
    else if (a.length == b.length)
    {
        return a == b ? 0 : (a < b ? -1 : 1)
    }
    else
    {
        return 1
    }   
}

export {
    deepFreeze,
    letter,
    forEachLetter,
    lettersOf,
    longStringsFirstComparator,
}