import * as path from 'path';
import * as url from 'url';
import * as express from 'express';
import axios from 'axios';

import { getXmlStats } from './xml-stats';
import * as templates from './templates';

const app = express();

app.use(express.static(path.join(__dirname, '../assets')));

app.use('/litrestest.html', async function(req: express.Request, res: express.Response) {
    let xmlFileUrl: string | undefined = req.query.XML;

    if (!xmlFileUrl) {
        res.send(templates.placeholder({}));
        return;
    }

    const { hostname, pathname } = url.parse(xmlFileUrl);
    if (!hostname) {
        xmlFileUrl = url.format({
            protocol: 'http',
            hostname: 'localhost',
            port: 3000,
            pathname
        });
    }

    const { data: xmlFile } = await axios.get<string>(xmlFileUrl, { responseType: 'text' });

    console.log(xmlFile.substr(0, 100));

    const xmlStats = getXmlStats(xmlFile);

    res.send(templates.report(xmlStats));
});

console.log('Starting server...');
app.listen(3000, () => console.log('Server is started on port 3000'));
