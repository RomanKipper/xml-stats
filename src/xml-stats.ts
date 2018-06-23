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
    READ_PAIRED_TAG_NAME
}

const CONTEXT_LENGTH = 100;

class ParserError extends Error {
    constructor(message: string) {
        super('XML parser error: ' + message);
    }
}

class UnexpectedCharacterError extends ParserError {
    constructor(state: ParserState, xml: string, charPosition: number) {
        const contextLeft = xml.substring(charPosition - CONTEXT_LENGTH / 2, charPosition);
        const contextRight = xml.substring(charPosition + 1, charPosition + CONTEXT_LENGTH / 2);
        super(`Got unexpected character in state ${ParserState[state]}: ...${contextLeft}[${xml[charPosition]}]${contextRight}...`);
    }
}

function getXmlStats(xml: string): XmlStats {
    let parserState: ParserState = ParserState.FIND_TAG;
    let parsedHeader = false;
    let letterCount = 0;
    const linkIds: string[] = [];
    const elementIds: string[] = [];
    const tagNameStack: string[] = [];
    let tagName = '';
    let attrName = '';
    let attrValue = '';

    for (let parserPosition = 0; parserPosition < xml.length; parserPosition++) {
        const character = xml[parserPosition];

        switch (parserState) {
            case ParserState.FIND_TAG:
                if (/\s/.test(character)) {
                    continue;
                }
                if (character === '<') {
                    if (parsedHeader) {
                        parserState = ParserState.READ_TAG_NAME;
                        tagName = '';
                        continue;
                    } else if (xml[parserPosition + 1] === '?') {
                        parserState = ParserState.READ_TAG_NAME;
                        parserPosition++;
                        continue;
                    }
                }
                break;
            case ParserState.READ_TAG_NAME:
                if (/[\w-]/.test(character)) {
                    tagName += character;
                    continue;
                }
                if (/\s/.test(character)) {
                    if (parsedHeader || tagName === 'xml') {
                        tagNameStack.push(tagName);
                        parserState = ParserState.FIND_ATTRIBUTE;
                        continue;
                    }
                }
                if (parsedHeader && character === '>') {
                    tagNameStack.push(tagName);
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                if (parsedHeader && character === '/' && xml[parserPosition + 1] === '>') {
                    parserPosition++;
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                break;
            case ParserState.FIND_ATTRIBUTE:
                if (/\s/.test(character)) {
                    continue;
                }
                if (/\w/.test(character)) {
                    parserState = ParserState.READ_ATTRIBUTE_NAME_OF_PREFIX;
                    attrName = character;
                    continue;
                }
                if (parsedHeader && character === '>') {
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                if (parsedHeader && character === '/' && xml[parserPosition + 1] === '>') {
                    tagNameStack.pop();
                    parserPosition++;
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                if (!parsedHeader && character === '?' && xml[parserPosition + 1] === '>') {
                    tagNameStack.pop();
                    parserPosition++;
                    parsedHeader = true;
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                break;
            case ParserState.READ_ATTRIBUTE_NAME_OF_PREFIX:
                if (/[\w-]/.test(character)) {
                    attrName += character;
                    continue;
                }
                if (character === ':') {
                    // There was just a prefix, from now we build the actual attribute name.
                    parserState = ParserState.READ_ATTRIBUTE_NAME;
                    attrName = '';
                    continue;
                }
                if (character === '=' && xml[parserPosition + 1] === '\"') {
                    parserState = ParserState.READ_ATTRIBUTE_VALUE;
                    parserPosition++;
                    attrValue = '';
                    continue;
                }
                break;
            case ParserState.READ_ATTRIBUTE_NAME:
                if (/[\w-]/.test(character)) {
                    attrName += character;
                    continue;
                }
                if (character === '=' && xml[parserPosition + 1] === '\"') {
                    parserState = ParserState.READ_ATTRIBUTE_VALUE;
                    parserPosition++;
                    attrValue = '';
                    continue;
                }
                break;
            case ParserState.READ_ATTRIBUTE_VALUE:
                if (character === '\"') {
                    if (tagName === 'a' && attrName === 'href') {
                        if (attrValue[0] === '#') {
                            linkIds.push(attrValue.substring(1));
                        } else {
                            throw new ParserError(`Invalid link id: ${attrValue}`);
                        }
                    } else if (attrName === 'id') {
                        elementIds.push(attrValue);
                    }
                    parserState = ParserState.FIND_ATTRIBUTE;
                    continue;
                }
                attrValue += character;
                continue;
            case ParserState.READ_CONTENT:
                if (character === '<') {
                    if (xml[parserPosition + 1] === '/') {
                        parserState = ParserState.READ_PAIRED_TAG_NAME;
                        tagName = '';
                        parserPosition++;
                    } else {
                        parserState = ParserState.READ_TAG_NAME;
                        tagName = '';
                    }
                    continue;
                }
                if (character !== '>') {
                    if (/[a-zA-Zа-яА-ЯёЁ\d]/.test(character)) {
                        letterCount++;
                    }
                    continue;
                }
                break;
            case ParserState.READ_PAIRED_TAG_NAME:
                if (/[\w-]/.test(character)) {
                    tagName += character;
                    continue;
                }
                if (character === '>') {
                    const pairedTagName = tagNameStack[tagNameStack.length - 1];
                    if (tagName !== pairedTagName) {
                        throw new ParserError(`Tag mismatch: <${pairedTagName}> ... </${tagName}>; stack: ${tagNameStack}`);
                    }
                    tagNameStack.pop();
                    parserState = ParserState.READ_CONTENT;
                    continue;
                }
                break;
        }

        throw new UnexpectedCharacterError(parserState, xml, parserPosition);
    }

    const brokenlinkIds = linkIds.filter(linkId => elementIds.indexOf(linkId) === -1);

    return {
        letterCount,
        totalLinkCount: linkIds.length,
        brokenLinkCount: brokenlinkIds.length
    };
}

export {
    XmlStats,
    getXmlStats
};
