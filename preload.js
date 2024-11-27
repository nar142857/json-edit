// 确保 window.services 存在
if (typeof window === 'undefined') {
    global.window = {}
}
if (!window.services) {
    window.services = {}
}

const fs = require('fs')

// 定义服务方法
window.services = {
    readFile: (filePath, encoding = 'utf8') => {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, encoding, (error, data) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(data)
                }
            })
        })
    },
    writeFile: (filePath, content, encoding = 'utf8') => {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, encoding, (error) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(true)
                }
            })
        })
    }
}