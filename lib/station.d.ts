import { Memphis } from ".";
export declare class Station {
    private connection;
    name: string;
    internalName: string;
    constructor(connection: Memphis, name: string);
    destroy(): Promise<void>;
}
