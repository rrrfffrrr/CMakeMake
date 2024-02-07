import { Library } from "./library"
import { Module, platforms } from "./module"

export interface LibraryDefine {
    sources: string[]
    includes: string[]
    shared: string
    static: string

    config: string

    preScript: string[]
    postScript: string[]

    [key: string]: any
}

export interface ModuleDefine {
    name: string
    packageName?: string
    dependencies?: string[]
    platforms: {
        [key: string]:{
            libs: Partial<LibraryDefine>[]
        }
    }

    [key:string]: any
}

function parseLibrary(define: Partial<LibraryDefine>): Library {
    if (define.sources) {
        return {
            type: 'source',
            sources: define.sources,
            includes: define.includes,
            preScript: define.preScript,
            postScript: define.postScript
        }
    }
    if (define.shared) {
        return {
            type: 'shared',
            includes: define.includes,
            static: define.static,
            shared: define.shared,
            config: define.config,
            preScript: define.preScript,
            postScript: define.postScript
        }
    }
    if (define.static) {
        return {
            type: 'static',
            includes: define.includes,
            static: define.static,
            config: define.config,
            preScript: define.preScript,
            postScript: define.postScript
        }
    }
    if (define.includes) {
        return {
            type: 'include',
            includes: define.includes,
            preScript: define.preScript,
            postScript: define.postScript
        }
    }
    if (define.preScript || define.postScript) {
        return {
            type: 'raw',
            script: [
                ...define.preScript ?? [],
                ...define.postScript ?? []
            ]
        }
    }
    
    throw new Error('Invalid library definition')
}
export function ParseModule(define: ModuleDefine) {
    const module = new Module(define.name, define.packageName)
    module.deps(...define.dependencies ?? [])
    for(const platform in define.platforms) {
        const platformData = define.platforms[platform]
        module.platform(<platforms>platform, platformData.libs.map(parseLibrary))
    }
    return module
}