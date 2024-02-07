export interface BaseLibrary {
    preScript?: string[]
    postScript?: string[]
}

export interface SourceLibrary extends BaseLibrary {
    type: 'source'
    sources: string[]
    includes?: string[]
}
export interface SharedLibrary extends BaseLibrary {
    type: 'shared'
    includes?: string[]
    static?: string
    shared: string
    config?: string
}
export interface StaticLibrary extends BaseLibrary {
    type: 'static'
    includes?: string[]
    static: string
    config?: string
}
export interface IncludeLibrary extends BaseLibrary {
    type: 'include'
    includes: string[]
}
export interface RawLibrary {
    type: 'raw'
    script: string[]
}

export type Library = SourceLibrary | SharedLibrary | StaticLibrary | IncludeLibrary | RawLibrary