interface XmlStats {
    letterCount: number;
    totalLinkCount: number;
    brokenLinkCount: number;
}

enum ParserState {
    FIND_TAG,
    READ_TAG_NAME,
    FIND_ATTRIBUTE,
    READ_ATTRIBUTE_NAME_OF_PREFIX,
    READ_ATTRIBUTE_NAME,
    READ_ATTRIBUTE_VALUE,
    READ_CONTENT,
    CLOSE_TAG,
    CLOSE_PAIRED_TAG,
    READ_PAIRED_TAG_NAME
}

class ParserError extends Error {
    constructor(state: ParserState, xml: string, charPosition: number) {
        super(`XML parser error: ${charPosition}: found character "${xml[charPosition]}" in state ${ParserState[state]}; context: ${xml.substring(charPosition - 10, charPosition + 10)}`);
    }
}

function getXmlStats(xml: string): XmlStats {
    let letterCount = 0;
    const linksId: string[] = [];
    const linkedElementsId: string[] = [];

    let parserState: ParserState = ParserState.FIND_TAG;
    let parsedHeader = false;

    let tagName = '';
    let pairedTagName = '';
    let attrName = '';
    let attrValue = '';

    for (let parserPosition = 0; parserPosition < xml.length; parserPosition++) {
        const character = xml[parserPosition];

        switch (parserState) {
            case ParserState.FIND_TAG:
                if (/\s/.test(character)) {
                    break;
                }
                if (character === '<') {
                    if (!parsedHeader) {
                        if (xml[parserPosition + 1] === '?') {
                            parserPosition++;
                        } else {
                            throw new ParserError(parserState, xml, parserPosition);
                        }
                    } else {
                        parserState = ParserState.READ_TAG_NAME;
                        tagName = '';
                        break;
                    }
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.READ_TAG_NAME:
                if (/\w/.test(character)) {
                    tagName += character;
                    break;
                }
                if (/\s/.test(character)) {
                    parserState = ParserState.FIND_ATTRIBUTE;
                    break;
                }
                if (character === '>' && parsedHeader) {
                    parserState = ParserState.READ_CONTENT;
                    break;
                }
                if (character === '/' && parsedHeader) {
                    parserState = ParserState.CLOSE_TAG;
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.CLOSE_TAG:
                if (character === '>') {
                    parserState = ParserState.FIND_TAG;
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.FIND_ATTRIBUTE:
                if (/\s/.test(character)) {
                    break;
                }
                if (/\w/.test(character)) {
                    parserState = ParserState.READ_ATTRIBUTE_NAME_OF_PREFIX;
                    attrName = '';
                    break;
                }
                if (!parsedHeader) {
                    if (character === '?' && xml[parserPosition + 1] === '>') {
                        parsedHeader = true;
                        break;
                    }
                } else if (character === '>') {
                    parserState = ParserState.READ_CONTENT;
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.READ_ATTRIBUTE_NAME_OF_PREFIX:
                if (/\w/.test(character)) {
                    attrName += character;
                    break;
                }
                if (character === ':') {
                    // There was just a prefix, from now we build the actual attribute name.
                    parserState = ParserState.READ_ATTRIBUTE_NAME;
                    attrName = '';
                    break;
                }
                if (character === '\"') {
                    parserState = ParserState.READ_ATTRIBUTE_VALUE;
                    attrValue = '';
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.READ_ATTRIBUTE_NAME:
                if (/\w/.test(character)) {
                    attrName += character;
                    break;
                }
                if (character === '\"') {
                    parserState = ParserState.READ_ATTRIBUTE_VALUE;
                    attrValue = '';
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.READ_ATTRIBUTE_VALUE:
                if (character === '\"') {
                    if (tagName === 'a' && attrName === 'href') {
                        if (attrValue[0] === '#') {
                            linksId.push(attrValue.substring(1));
                        } else {
                            throw new Error(`Invalid link id: ${attrValue}`);
                        }
                    } else if (attrName === 'id') {
                        if (attrValue[0] === '#') {
                            linkedElementsId.push(attrValue.substring(1));
                        } else {
                            throw new Error(`Invalid link id: ${attrValue}`);
                        }
                    }
                    parserState = ParserState.FIND_ATTRIBUTE;
                    break;
                }
                attrValue += character;
                break;
            case ParserState.READ_CONTENT:
                if (character === '<') {
                    parserState = ParserState.CLOSE_PAIRED_TAG;
                    break;
                }
                if (character === '>') {
                    throw new ParserError(parserState, xml, parserPosition);
                }
                if (/\S/.test(character)) {
                    letterCount++;
                }
                break;
            case ParserState.CLOSE_PAIRED_TAG:
                if (character === '/') {
                    parserState = ParserState.READ_PAIRED_TAG_NAME;
                    pairedTagName = '';
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
            case ParserState.READ_PAIRED_TAG_NAME:
                if (/\w/.test(character)) {
                    pairedTagName += character;
                    break;
                }
                if (character === '>') {
                    if (tagName !== pairedTagName) {
                        throw new Error(`Tag name mismatch: <${tagName}> ... </${pairedTagName}>`);
                    }
                    parserState = ParserState.FIND_TAG;
                    break;
                }
                throw new ParserError(parserState, xml, parserPosition);
        }
    }

    const brokenLinksId = linksId.filter(id => linkedElementsId.every(linkId => linkId !== id));

    return {
        letterCount,
        totalLinkCount: linksId.length,
        brokenLinkCount: brokenLinksId.length
    };
}

export {
    XmlStats,
    getXmlStats
};
