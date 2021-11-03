"use strict"

export function localeCompare(a, b) {
    if (!a)
        return -1
    return a.localeCompare(b)
}

export function getProperty(data, property, defaultValue) {
    return data.hasOwnProperty(property) ? data[property] : defaultValue 
}

export function getRequiredProperty(data, property) {
    if (!data.hasOwnProperty(property))
        throw new Error(`Missing required property ${property} of object ${data}!`)
    return data[property]
}

export function deepFreeze(obj) {
    let propNames = Object.getOwnPropertyNames(obj)

    propNames.forEach(function(name) {
        let prop = obj[name]

        if (typeof prop == 'object' && prop !== null)
        deepFreeze(prop)
    })

    return Object.freeze(obj)
}

export function forEachLetter(word, callback) {
    for (let i = 0; i < word.length; ++i)
        callback(word.slice(i, i+1), i)
}

export function letter(word, index) {
    return word.slice(index, index + 1)
}

export function lettersOf(word) {
    let result = []
    forEachLetter(word, letter => result.push(letter))
    return result
}

export function longStringsFirstComparator(a, b) {
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
