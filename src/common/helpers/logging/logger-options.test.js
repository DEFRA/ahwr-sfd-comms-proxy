import { loggerOptions } from './logger-options.js'
import { getTraceId } from '@defra/hapi-tracing'

jest.mock('@defra/hapi-tracing')

describe('logger-options', () => {
  it('mixin adds trace id when available', () => {
    getTraceId.mockReturnValueOnce('1234567890')
    const result = loggerOptions.mixin()
    expect(result).toEqual({ trace: { id: '1234567890' } })
  })

  it('mixin adds nothing when trace id not available', () => {
    getTraceId.mockReturnValueOnce(null)
    const result = loggerOptions.mixin()
    expect(result).toEqual({})
  })
})
