export default function useStorage() {

  /**
  * ローカルストレージにオブジェクトを保存
  * @param obj ローカルストレージに保存するオブジェクト
  */
  const setLocalStorage = (obj: any) => {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => {
        // @ts-ignore
        resolve();
      });
    });
  }

  /**
  * ローカルストレージからオブジェクトを取得
  * @param key ローカルストレージを取得するkey
  */
  const getLocalStorage = <T>(key: string) => {
    return new Promise<T>((resolve) => {
      chrome.storage.local.get(key, (item) => {
        key ? resolve(<T>item[key]) : resolve(<T>item);
      });
    });
  }

      /**
  * ローカルストレージにオブジェクトを保存
  * @param obj ローカルストレージに保存するオブジェクト
  */
       const setSyncStorage = (obj: any) => {
        return new Promise((resolve) => {
          chrome.storage.local.set(obj, () => {
            // @ts-ignore
            resolve();
          });
        });
      }

      /**
      * ローカルストレージからオブジェクトを取得
      * @param key ローカルストレージを取得するkey
      */
      const getSyncStorage = <T>(key: string) => {
        return new Promise<T>((resolve) => {
          chrome.storage.local.get(key, (item) => {
            key ? resolve(<T>item[key]) : resolve(<T>item);
          });
        });
      }

  const addStorangeChangeEventListener = (key: string, callback: (oldValue: any, newValue: any) => void) => {
    chrome.storage.onChanged.addListener((change: any) => {
      callback(change?.[key]?.oldValue, change?.[key]?.newValue);
    });
  }

  return {
    setLocalStorage,
    getLocalStorage,
    setSyncStorage,
    getSyncStorage,
    addStorangeChangeEventListener
  }
}
