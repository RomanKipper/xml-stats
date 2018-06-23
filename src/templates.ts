import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

import { XmlStats } from './xml-stats';

function loadTemplate<T>(name: string) {
    const templateSource = fs.readFileSync(path.join(__dirname, name), 'utf8');
    return handlebars.compile<T>(templateSource);
}

export const report = loadTemplate<XmlStats>('report.hbs');
export const placeholder = loadTemplate<{}>('placeholder.hbs');
export const error = loadTemplate<string>('error.hbs');
