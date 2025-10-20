
export interface DocxContentControl {
    name: string,
    value: string
}

export interface DocxCreateResponse {
    success: boolean,
    url: string,
    error: string,
    fileName?: string
}
