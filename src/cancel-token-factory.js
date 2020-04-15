import partialRight from 'lodash/partialRight'
import isNil from 'lodash/isNil'
import isFunction from 'lodash/isFunction'

// CancelToken 工厂
export function cancelTokenFactory() {
  const cancelTokenMap = new Map()

  return partialRight(dealWithCancelToken, cancelTokenMap)
}

// 处理 CancelToken，必须用请求标识 requestId 来决定 本次请求 是否需要取消 之前请求
export function dealWithCancelToken(requestId, cancel, cancelTokenMap) {
  const methodSet = ['get', 'set', 'delete']

  // 请求标识不存在 或者 存储不合法，则不做处理
  if (
    isNil(requestId) ||
    !cancelTokenMap ||
    !(
      cancelTokenMap instanceof Map ||
      cancelTokenMap instanceof WeakMap ||
      methodSet.every(method => isFunction(cancelTokenMap[method]))
    )
  ) {
    // 20200220 不能在此 自动构建 Map，因为 如果这么做的话，每次的调用，cancelTokenMap 都可能是一个新的、不一样的实例，导致下面逻辑无效
    return
  }

  // 获取之前的 cancelToken
  let token = cancelTokenMap.get(requestId)

  // 执行注销 CancelToken 逻辑，一般用于 finally 中
  if (cancel === false) {
    if (!token) return

    // Promise 属于微任务，取消操作执行后需要等待主线执行完毕，才执行这里的微任务，要确保新请求的 cancel 不会被置空
    if (token.isCanceled) {
      token.isCanceled = false
      cancelTokenMap.set(requestId, token)
      return
    }

    // 只有正常结束才删除 cancelToken
    token.cancel = null
    cancelTokenMap.delete(requestId)

    return
  }

  // 执行注册 CancelToken 逻辑，用于 新增 cancelToken
  if (token && token.cancel) {
    // 本次请求 和 上次请求 都需要唯一性，则终止上一次的请求，放弃请求结果
    if (isFunction(cancel)) {
      token.cancel(requestId)
      token.cancel = null
    }

    token.isCanceled = true
    cancelTokenMap.set(requestId, token)
  }

  // 记录 本次 cancelToken
  if (isFunction(cancel)) {
    token = token || {}
    token.cancel = cancel
    cancelTokenMap.set(requestId, token)
  }
}
