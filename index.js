const {src, dest, parallel, series, watch} = require('gulp');


const del = require("del");

const browserSync = require('browser-sync')

const plugins = require('gulp-load-plugins')();


//获取当前命令行的工作目录
const cwd = process.cwd();

//配置文件
let config = {
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            image: 'assets/images/**',
            fonts: 'assets/fonts/**',
        }
    }
};


try {
    const loadConfig = require(`${cwd}/pages.config.js`)
    //得到合并的对象
    config = Object.assign({}, config, loadConfig);
} catch (e) {

}


const sass = plugins.sass(require('sass'));
const bs = browserSync.create();


const clean = () => {
    return del([config.build.dist, config.build.temp])
}


const style = () => {
    return src(config.build.paths.styles, {
        base: config.build.src,
        cwd: config.build.src,
    })
        .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
        .pipe(dest(config.build.temp))
    // .pipe(bs.reload({stream: true})) //这个写了，bs初始化的时候 files配置就可以省略掉。
}


const script = () => {
    return src(config.build.paths.scripts, {
        base: config.build.src,
        cwd: config.build.src,
    })
        .pipe(plugins.babel({
            presets: [
                require('@babel/preset-env')
            ]
        }))
        .pipe(dest(config.build.temp))
}


const page = () => {
    return src(config.build.paths.pages, {
        base: config.build.src,
        cwd: config.build.src,
    })
        .pipe(plugins.swig({
            //关闭缓存
            defaults: {cache: false},
            data: config.data
        }))
        .pipe(dest(config.build.temp))
}


const image = () => {
    return src(config.build.paths.image, {
        base: config.build.src,
        cwd: config.build.src,
    })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}


const font = () => {
    return src(config.build.paths.fonts, {
        base: config.build.src,
        cwd: config.build.src,
    })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}


//额外的任务
const extra = () => {
    return src('**', {
        base: config.build.public,
        cwd: config.build.public,
    })
        .pipe(dest(config.build.dist))
}


//开发服务器
const serve = () => {

    //监听src的源代码
    watch(config.build.paths.styles, {cwd: config.build.src}, style)
    watch(config.build.paths.scripts, {cwd: config.build.src}, script)
    watch(config.build.paths.pages, {cwd: config.build.src}, page)

    // watch('src/assets/images/**', image)
    // watch('src/assets/fonts/**', font)
    // watch('public/**', extra)
    watch([
        config.build.paths.image,
        config.build.paths.fonts,
        // 'public/**'
    ], {cwd: config.build.src}, bs.reload)
    //处理public目录
    watch("**", {cwd: config.build.public}, bs.reload)

    bs.init({
        notify: false,
        port: 3001,
        open: true,
        files: `${config.build.temp}/**`,
        server: {
            baseDir: [config.build.temp, config.build.src, config.build.public],
            routes: {
                '/node_modules': '../node_modules'
            }
        }
    })
}


const useref = () => {
    return src(config.build.paths.pages, {base: config.build.temp, cwd: config.build.temp})
        .pipe(plugins.useref({
            searchPath: [config.build.temp, '.']
        }))
        //html js css
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minfyJS: true
        })))
        .pipe(dest(config.build.dist))
}

//编译任务
const compile = parallel(style, script, page)

// 构建任务，上线之前执行一遍就可以了
const build = series(clean, parallel(series(compile, useref), image, font, extra));

const develop = series(clean, compile, serve)

module.exports = {
    clean,
    build,
    develop,
}
