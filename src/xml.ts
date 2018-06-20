import XmlStats from './XmlStats';

enum ParserState {
    INSIDE_TAG,
    TAG_NAME,
    CLOSE_TAG_NAME,
    ATTRIBUTE
}

export function gatherXmlStats(xml: string): XmlStats {
    let letterCount = 0;
    const linksId: string[] = [];
    const linkedElementsId: string[] = [];

    let parserPosition = 0;

    while (parserPosition < xml.length) {

    }

    const brokenLinksId = linksId.filter(id => linkedElementsId.every(linkId => linkId !== id));

    return {
        letterCount,
        totalLinkCount: linksId.length,
        brokenLinkCount: brokenLinksId.length
    };
}
