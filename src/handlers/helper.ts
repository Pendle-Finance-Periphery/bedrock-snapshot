import { ID } from "@sentio/sdk/store"
import { Label } from "../schema/schema.js"

export function convertIdToUser(id: ID): {
    label: Label,
    addr: string
} {
    const [label, addr] = id.toString().split("-");
    validateLabel(label);
    return { label: label as Label, addr };
}

export function convertUserToId(label: Label, addr: string): string {
    validateLabel(label);
    return `${label}-${addr}`;
}

function validateLabel(label: string) {
    if (!Object.values(Label).includes(label as Label)) {
        throw new Error(`Invalid label: ${label}`);
    }
}