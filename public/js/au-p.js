console.log('au-p.js');
let delayTimer = null
let kkstart = false
let ruleForm = {}
let event = document.createEvent('Event');
event.initEvent('auEvent', true, true);
document.addEventListener('auEvent', ({ detail }) => {
  // console.log('detail: ', detail);
  // 接受数据
  let { type, data } = detail;
  console.log(detail);
  // if (type === 'download') {
  //   kkstart = true
  //   clearTimeout(delayTimer)
  //   ruleForm = JSON.parse(JSON.stringify(data))
  // } else if (type === 'stop') {
  //   kkstart = false
  //   clearTimeout(delayTimer)
  // }
});

function parseQueryString(queryString) {
  if(!queryString) return {}
  let params = new URLSearchParams(queryString);
  let result = {};

  for (let [key, value] of params) {
    result[key] = value;
  }

  return result;
}


// 监听请求
(function (xhr) {

  var XHR = XMLHttpRequest.prototype;

  var open = XHR.open;
  var send = XHR.send;
  var setRequestHeader = XHR.setRequestHeader;

  XHR.open = function (method, url) {
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = (new Date()).toISOString();

    return open.apply(this, arguments);
  };

  XHR.setRequestHeader = function (header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };


  XHR.send = function (postData) {

    this.addEventListener('load', function () {

      var myUrl = this._url ? this._url.toLowerCase() : this._url;
      if (myUrl) {
        let securityId = ''
        if (postData) {
          if (typeof postData === 'string') {
            // console.log('请求数据url: ', myUrl);
            // console.log('请求数据: ', postData);
            // console.log('_requestHeaders: ', this._requestHeaders);
            if (postData.indexOf('accountUuid') !== -1 && postData.indexOf('startDate')) {
              let queryString = decodeURIComponent(postData)
              let parsedObject = parseQueryString(queryString);
              console.log(parsedObject);
              try {
                localStorage.setItem('aup',JSON.stringify(parsedObject))
              } catch (error) {
                console.log('error: ', error);
              }
            }

            try {
              this._requestHeaders = postData;
            } catch (err) {
              console.log('Request Header JSON decode failed, transfer_encoding field could be base64');
              console.log(err);
            }
          } else if (typeof postData === 'object' || typeof postData === 'array' || typeof postData === 'number' || typeof postData === 'boolean') {
            // do something if you need
          }
        }

        // here you get the RESPONSE HEADERS
        var responseHeaders = this.getAllResponseHeaders();

        if (this.responseType != 'blob' && this.responseText) {
          // responseText is string or null
          try {

            // here you get RESPONSE TEXT (BODY), in JSON format, so you can use JSON.parse
            var arr = this.responseText;

            // printing url, request headers, response headers, response body, to console

            // console.log(this._url);
            // console.log('_requestHeaders',this._requestHeaders);
            // console.log('responseHeaders',responseHeaders);
            // console.log(JSON.parse(arr));

            // console.log('响应数据url: ', this._url);
            // console.log('响应数据: ', arr);


            // if (this._url && this._url.indexOf('postDownload') !== -1) {
            //   window.postMessage({
            //     actionType: 'aubank', data: {
            //       type: 'updateAuParms',
            //       t: new Date().getTime()
            //     }
            //   }, '*');
            // }

            // let keyrefpointer = responseHeaders.match(/keyrefpointer:(.*)/g)
            // console.log('keyrefpointer: ', keyrefpointer);


          } catch (err) {
            console.log("Error in responseType try catch");
            console.log(err);
          }
        }

      }
    });

    return send.apply(this, arguments);
  };

})(XMLHttpRequest);
