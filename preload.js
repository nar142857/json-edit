window.services = {
    readFileContent: e => {
        try {
            return require("fs").readFileSync(e, "utf-8")
        } catch (e) {
            return ""
        }
    }
};