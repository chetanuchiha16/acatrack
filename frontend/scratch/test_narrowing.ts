import { AxiosResponse, AxiosError } from 'axios';

type RequestResult<TData, TError, ThrowOnError extends boolean> = 
  ThrowOnError extends true
    ? AxiosResponse<TData>
    : (AxiosResponse<TData> & { error: undefined })
      | (AxiosError<TError> & { data: undefined; error: TError });

function test(res: RequestResult<unknown, unknown, boolean>) {
    if ('error' in res && res.error) {
        console.log(res.error);
    }
}
