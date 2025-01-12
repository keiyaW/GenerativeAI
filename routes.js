function listener(req, res) {
    if(req.url = "/") {
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({name:'test'}));
    }
}

exports.listener = listener;