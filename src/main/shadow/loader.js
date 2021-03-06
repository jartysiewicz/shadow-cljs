goog.provide("shadow.loader");
goog.require("goog.module.ModuleManager");
goog.require("goog.module.ModuleLoader");
goog.require("goog.object");
goog.require("goog.html.uncheckedconversions");
goog.require("goog.string.Const");

// this is written in JS so it doesn't depend on cljs.core

shadow.loader.ml = new goog.module.ModuleLoader();
shadow.loader.ml.setSourceUrlInjection(true);

shadow.loader.mm = goog.module.ModuleManager.getInstance();
shadow.loader.mm.setLoader(shadow.loader.ml);

shadow.loader.initCalled = false;

shadow.loader.ensureInitWasCalled = function() {
  if (!shadow.loader.initCalled) {
    throw new Error("shadow.loader API was called before shadow.loader.init!\n" +
        "You are probably calling module loader too early before shadow-cljs got fully initialized.");
  }
}

shadow.loader.init = function(uriPrefix) {
  if (shadow.loader.initCalled) {
    throw new Error("shadow.loader.init was already called! If you are calling it manually set :module-loader-init false in your config.");
  }

  if (goog.global.shadow$modules) {
    var mm = shadow.loader.mm;
    mm.setAllModuleInfo(goog.global.shadow$modules["infos"]);

    var uris = goog.global.shadow$modules["uris"];

    // this is absurd. the uris are generated by the compiler. should be trusted already.
    // I would really like to know how Google integrates this data into their builds
    var trustReason = goog.string.Const.from("generated by compiler");

    goog.object.getKeys(uris).forEach(function(key) {
      var module_uris = uris[key];
      if (module_uris.length == 0) {
        // default module is added without uris since it will always be loaded
        // when this is called
        mm.getModuleInfo(key).setLoaded();
      } else {
        var trusted_uris = [];
        module_uris.forEach(function(module_uri) {
          var trusted = goog.html.uncheckedconversions.trustedResourceUrlFromStringKnownToSatisfyTypeContract(
            trustReason,
            uriPrefix + module_uri
          );
          trusted_uris.push(trusted);
        });
        mm.getModuleInfo(key).setTrustedUris(trusted_uris);
      }
    });

    shadow.loader.initCalled = true;
  }
};

shadow.loader.getModuleManager = function() {
  return shadow.loader.mm;
};

shadow.loader.getModuleLoader = function() {
  return shadow.loader.ml;
};

// allow calling (shadow.loader/load :with-a-keyword)
shadow.loader.string_id = function(id) {
  var result = id.toString();
  if (result.charAt(0) == ":") {
    result = result.substring(1);
  }
  return result;
};

shadow.loader.set_load_start = function(id) {
  shadow.loader.mm.beforeLoadModuleCode(id);
};

// FIXME: id no longer required, just keeping it in case someone ends up using old closure lib
shadow.loader.set_loaded = function(id) {
  shadow.loader.mm.setLoaded(id);
};

// ignored. only for cljs.loader compat
shadow.loader.set_loaded_BANG_ = function() {};

shadow.loader.loaded_QMARK_ = function(id) {
  return shadow.loader.mm.getModuleInfo(shadow.loader.string_id(id)).isLoaded();
};

shadow.loader.with_module = function(
  moduleId,
  fn,
  opt_handler,
  opt_noLoad,
  opt_userInitiated,
  opt_preferSynchronous
) {
  shadow.loader.ensureInitWasCalled();
  return shadow.loader.mm.execOnLoad(
    shadow.loader.string_id(moduleId),
    fn,
    opt_handler,
    opt_noLoad,
    opt_userInitiated,
    opt_preferSynchronous
  );
};

shadow.loader.load = function(id, cb) {
  shadow.loader.ensureInitWasCalled();
  id = shadow.loader.string_id(id);
  if (cb) {
    shadow.loader.mm.execOnLoad(id, cb);
  }
  return shadow.loader.mm.load(id);
};

shadow.loader.load_multiple = function(ids, opt_userInitiated) {
  shadow.loader.ensureInitWasCalled();
  return shadow.loader.mm.loadMultiple(ids, opt_userInitiated);
};

shadow.loader.prefetch = function(id) {
  shadow.loader.ensureInitWasCalled();
  shadow.loader.mm.prefetchModule(shadow.loader.string_id(id));
};

shadow.loader.preload = function(id) {
  shadow.loader.ensureInitWasCalled();
  return shadow.loader.mm.preloadModule(shadow.loader.string_id(id));
};

// FIXME: not sure these should always be exported
goog.exportSymbol("shadow.loader.with_module", shadow.loader.with_module);
goog.exportSymbol("shadow.loader.init", shadow.loader.init);
goog.exportSymbol("shadow.loader.load", shadow.loader.load);
goog.exportSymbol("shadow.loader.load_multiple", shadow.loader.load_multiple);
goog.exportSymbol("shadow.loader.prefetch", shadow.loader.prefetch);
goog.exportSymbol("shadow.loader.preload", shadow.loader.preload);
