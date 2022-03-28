export declare const S_WHATSAPP_NET = "@s.whatsapp.net";
export declare const OFFICIAL_BIZ_JID = "16505361212@c.us";
export declare const SERVER_JID = "server@c.us";
export declare const PSA_WID = "0@c.us";
export declare const STORIES_JID = "status@broadcast";
export declare type JidServer = 'c.us' | 'g.us' | 'broadcast' | 's.whatsapp.net' | 'call';
export declare type JidWithDevice = {
    user: string;
    device?: number;
};
export declare const jidEncode: (user: string | number | null, server: JidServer, device?: number, agent?: number) => string;
export declare const jidDecode: (jid: string) => {
    server: string;
    user: string;
    agent: number;
    device: number;
};
/** is the jid a user */
export declare const areJidsSameUser: (jid1: string, jid2: string) => boolean;
/** is the jid a user */
export declare const isJidUser: (jid: string) => boolean;
/** is the jid a broadcast */
export declare const isJidBroadcast: (jid: string) => boolean;
/** is the jid a broadcast */
export declare const isJidGroup: (jid: string) => boolean;
/** is the jid the status broadcast */
export declare const isJidStatusBroadcast: (jid: string) => boolean;
export declare const jidNormalizedUser: (jid: string) => string;
