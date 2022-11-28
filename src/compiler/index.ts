import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'
import { CompilerOptions, CompiledResult } from 'types/compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 模版解析，通过正则等方式将用户传入的模板转换成AST
  const ast = parse(template.trim(), options)
  debugger
  if (options.optimize !== false) {
    // 优化阶段，遍历AST，找出其中的静态节点，并打上标记
    optimize(ast, options)
  }
  // 代码生成阶段，将AST转换成渲染函数
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
