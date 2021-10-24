"use strict"

const fs = require('fs')
const fsp = require('fs/promises')
const readline = require('readline')

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

async function saveStrings(strings, filePath) {
    const file = await fsp.open(filePath, 'w')
    for (let i = 0; i < strings.length; ++i)
        await file.write(strings[i] + "\n")
    await file.close()
}

async function loadStrings(filePath) {
    const fileStream = fs.createReadStream(filePath)
  
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })
   
    let strings = []
    for await (const line of rl)
        strings.push(line)
    return strings
}

async function saveObject(obj, filePath) {
    const file = await fsp.open(filePath, 'w')
    await file.write(JSON.stringify(obj, null, "\t"))
    await file.close()
}

async function loadObject(filePath) {
    const file = await fsp.open(filePath, 'r')
    const data = await file.readFile()
    const obj = JSON.parse(data)
    await file.close()
    return obj
}

exports.deepFreeze = deepFreeze
exports.letter = letter
exports.forEachLetter = forEachLetter
exports.lettersOf = lettersOf
exports.longStringsFirstComparator = longStringsFirstComparator
exports.saveStrings = saveStrings
exports.loadStrings = loadStrings
exports.saveObject = saveObject
exports.loadObject = loadObject