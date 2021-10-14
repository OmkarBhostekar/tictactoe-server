const express = require('express')
const morgan = require('morgan')

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// if (process.env.NODE_ENV === 'development') {
app.use(morgan('dev'))
    // }


module.exports = app