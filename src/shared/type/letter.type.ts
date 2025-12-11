
export interface DocxContentControl {
    name: string,
    value: string,
    contents?: DocxContentControl[]
}

export interface DocxCreateResponse {
    success: boolean,
    url: string,
    error: string,
    fileName?: string
}
