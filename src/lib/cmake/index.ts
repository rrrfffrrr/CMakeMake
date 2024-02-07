export { ModuleDefine, ParseModule } from './define'
export { Library } from './library'
export { Module, platforms } from './module'
import { exec } from 'child_process'
import { writeFile } from 'fs/promises'
import { EOL } from 'os'
import path from 'path'
import { Library } from './library'
import { Module, platforms } from './module'
import { ModuleDefine, ParseModule } from './define'
import { writeFileSync } from 'fs'

export class CMake {
    static readonly Version = '3.8'

    static generateProject(projectPath: string, buildPath: string) {
        return exec(`cmake -S \"${projectPath}\" -B \"${buildPath}\"`)
    }
    static buildProject(buildPath: string) {
        return exec(`cmake --build ${buildPath}`)
    }

    readonly project: string
    private readonly _modules = new Map<Module['name'], Module>()

    constructor(project: string) {
        this.project = project
    }

    get listModules() {
        return this._modules.keys()
    }

    add(module: Module) {
        if (this._modules.has(module.name)) {
            throw new Error(`Duplicate module name \"${module.name}\"`)
        }
        console.log(`Add module \"${module.name}\"`)
        this._modules.set(module.name, module)
        return this
    }
    parse(module: ModuleDefine) {
        this.add(ParseModule(module))
    }
    get(name: Module['name']) {
        return this._modules.get(name)
    }

    makeExecutable(platform: platforms, root: Module['name'], projectPath: string, buildPath: string) {
        return this._make(platform, root, projectPath, buildPath, 'executable')
    }
    makeLibrary(platform: platforms, root: Module['name'], projectPath: string, buildPath: string) {
        return this._make(platform, root, projectPath, buildPath, 'library')
    }

    private _make(platform: platforms, root: Module['name'], projectPath: string, buildPath: string, executable: 'executable' | 'library') {
        const cmakeLists = [
            '# Auto-generated CMakLists.txt',
            `project(${this.project})`,
            `cmake_minimum_required(VERSION ${CMake.Version})`
        ]

        const rootModule = this._modules.get(root)
        if (!rootModule) {
            throw new Error(`No root module found: \"${root}\"`)
        }

        if (executable) {
            cmakeLists.push(
                `set(DEF_PACKAGE_NAME ${rootModule.name})`,
                ''
            )
        } else {
            cmakeLists.push('')
        }

        cmakeLists.push(...this._makeModule(platform, rootModule, projectPath, buildPath, {}, executable))
        return new CMakeLists(cmakeLists)
    }

    private _makeModule(platform: platforms, module: Module, projectPath: string, buildPath: string, loadedModules: {[key: string]: true}, root?: 'executable' | 'library'): string[] {
        if (loadedModules[module.name]) {
            return []
        }
        loadedModules[module.name] = true
        
        const libaries = module.platforms[platform]
        if (!libaries) {
            throw new Error(`No target found for ${module.name}`)
        }

        const lines: string[] = []

        if (root) {
            switch(root) {
                case 'executable':
                    lines.push(`add_executable(${module.name})`)
                    break
                case 'library':
                    lines.push(`add_library(${module.name})`)
                    break
            }
        } else {
            lines.push(`add_library(${module.name}${libaries.some(lib => lib.type === 'source') ? '' : ' INTERFACE'})`)
        }

        for(let i = 0; i < libaries.length; ++i) {
            lines.push(...this._makeLibrary(module.name, `${i}`, libaries[i]))
        }

        if (module.dependencies) {
            for(const dependencyName of module.dependencies) {
                if (loadedModules[dependencyName]) {
                    continue
                }

                const dependencyModule = this._modules.get(dependencyName)
                if (!dependencyModule) {
                    throw new Error(`Module \"${dependencyName}\" not found`)
                }

                console.log(`Link library \"${dependencyName}\"`)

                lines.push(
                    `# <---- ${dependencyName} ---->`,
                    ...this._makeModule(platform, dependencyModule, projectPath, buildPath, loadedModules),
                    `target_link_libraries(${module.name} PUBLIC ${dependencyName})`,
                    `# <---- ${dependencyName} ---->`
                )
            }
        }

        return lines
    }

    private _makeLibrary(target: Module['name'], postfix: string, lib: Library): string[] {
        if (lib.type === 'raw') {
            return [...lib.script]
        }

        function body() {
            switch(lib.type) {
                case 'source': {
                    const lines = [ `target_sources(${target} ${lib.sources.map(v => `${EOL}\tPRIVATE \"${v}\"`).join('')}${EOL})`]
                    if (lib.includes) {
                        lines.push(`target_include_directories(${target} ${lib.includes.map(v => `${EOL}\tPUBLIC \"${v}\"`).join('')}${EOL})`)
                    }
                    return lines
                }
                case 'include': {
                    return [ `target_include_directories(${target} ${lib.includes.map(v => `${EOL}\tPUBLIC ${v}`).join('')}${EOL})` ]
                }
                case 'shared': {
                    const id = `${target}_STATIC_${postfix}`
                    const lines = [ `add_library(${id} SHARED IMPORTED)` ]
                    const config = lib.config ? `_${lib.config}` : ''
                    
                    if (lib.includes) {
                        lines.push(`set_target_properties(${id} PROPERTIES INTERFACE_INCLUDE_DIRECTORIES ${lib.includes.map(v => `\"${v}\"`).join(';')})`)
                    }
                    if (lib.static) {
                        lines.push(`set_target_properties(${id} PROPERTIES IMPORTED_IMPLIB${config} \"${lib.static}\")`)
                    }
                    lines.push(
                        `set_target_properties(${id} PROPERTIES IMPORTED_LOCATION${config} \"${lib.shared}\")`,
                        `target_link_libraries(${target} INTERFACE ${id})`
                    )
                
                    return lines
                }
                case 'static': {
                    const id = `${target}_STATIC_${postfix}`
                    const line = [ `add_library(${id} STATIC IMPORTED)` ]
                    const config = lib.config ? `_${lib.config}` : ''

                    if (lib.includes) {
                        line.push(`set_target_properties(${id} PROPERTIES INTERFACE_INCLUDE_DIRECTORIES ${lib.includes.map(v => `\"${v}\"`).join(';')})`)
                    }
                    line.push(
                        `set_target_properties(${id} PROPERTIES IMPORTED_LOCATION${config} \"${lib.static}\")`,
                        `target_link_libraries(${target} INTERFACE ${id})`
                    )

                    return line
                }
                default:
                    throw new Error(`Unexpected library type from ${target}_${postfix}`)
            }
        }

        return [
            ...(lib.preScript ?? []),
            ...body(),
            ...(lib.postScript ?? []),
        ]
    }
}

export class CMakeLists {
    readonly lines: string[]

    constructor(lines: string[]) {
        this.lines = [...lines]
    }

    save(dir: string) {
        const file = path.join(dir, 'CMakeLists.txt')
        writeFileSync(file, this.lines.join(EOL), { encoding: 'utf8' })
    }
}