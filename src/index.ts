import { CMake } from '@lib/cmake'
import { include } from '@lib/file'
import { loadProject, saveProject } from '@lib/project'
import { execSync } from 'child_process'
import { program } from 'commander'
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'fs'
import path from 'path'

program
    .name('SpicyBuild')
    .description('Generate and build C++ project using CMake')
    .version('0.0.1')

program
    .command('generate')
    .description('Generate project file')
    .argument('<project>', 'Project path')
    .argument('<build>', 'Build path')
    .option('--project <project>', 'Project identifier')
    .option('-p, --platform <platform>', 'Target platform: Win32, Win64', 'Win64')
    .option('-m, --module <module>', 'Root module', 'application')
    .option('-c, --clean', 'Clear previous cache')
    .action(async (project, build, opts) => {
        project = path.resolve(project)
        build = path.resolve(build)
        if (!existsSync(project) || !lstatSync(project).isDirectory()) {
            console.log(`Invalid project path: ${project}`)
            return
        }
        const projectLink = path.join(__dirname, 'project')
        
        if (existsSync(projectLink)) {
            unlinkSync(projectLink)
        }
        symlinkSync(project, projectLink, 'junction')
        try {
            if (!existsSync(build) ) {
                console.log(`Generate build directory at \"${build}\"`)
                mkdirSync(build, { recursive: true })
            } else if (opts.clean) {
                console.log(`Clear build cache at \"${build}\"`)
                rmSync(build, { recursive: true, force: true })
                mkdirSync(build, { recursive: true })
            }

            console.log(`Parse \"${project}\" for \"${opts.platform}\"`)
            const cmake = new CMake(opts.project ?? 'SpicyBuild')
            include(cmake, '@project/build')

            console.log(`Generate project \"${project}\" for \"${opts.platform}\"`)
            const cmakeLists = cmake.makeExecutable(opts.platform, opts.module, project, build)
            cmakeLists.save(project)
            saveProject(opts.project, project, build)

            try {
                execSync(`cmake -S ${project} -B ${build}`, { stdio: 'inherit' })
            } catch { }
        } finally {
            unlinkSync(projectLink)
        }
    })

program
    .command('build')
    .argument('<project>', 'project path')
    .action((project) => {
        project = path.resolve(project)
        const data = loadProject(project)
        execSync(`cmake --build ${data.cache}`)
    })

program.parse()