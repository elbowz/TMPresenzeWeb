# TODO
* Display anomalie
  ```javascript
  var knockout = require('knockout');
  var jsonUtils = require('jsonUtils');
  var runtime = require('runtime');
  var url = require('cartellino/url');
  var tw = require('tw');
  
  var app = runtime.newApp();
  var currentUser = app.currentUser();
  
  var params = new tw.TDynCartellinoIn({
      datainizio: new Date('03/01/2017'),
      datafine: new Date('03/30/2017'),
      tiporichiesta: tw.defs.tTipoRichiestaCartellino.trcSingoloDipendente,
      tipoconsultazione: tw.defs.tTipoConsultazioneCartellino.tccConsultazione
  });
  
  app.postData(url.ConsultaCartellino(currentUser.iddip), params, function (dati) {
  
    var sintesiNorm = jsonUtils.normalizza(dati.result.sintesi);
      
    console.log(sintesiNorm);
  });
  ```