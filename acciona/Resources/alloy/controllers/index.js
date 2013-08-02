function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    var $ = this;
    var exports = {};
    $.__views.index = Ti.UI.createWindow({
        backgroundColor: "white",
        id: "index"
    });
    $.__views.index && $.addTopLevelView($.__views.index);
    $.__views.__alloyId1 = Ti.UI.createTabGroup({
        tabsAtBottom: "true",
        id: "__alloyId1"
    });
    $.__views.index.add($.__views.__alloyId1);
    $.__views.__alloyId3 = Ti.UI.createWindow({
        id: "__alloyId3"
    });
    $.__views.__alloyId4 = Ti.UI.createWebView({
        url: "/html/atlantica.htm",
        id: "__alloyId4"
    });
    $.__views.__alloyId3.add($.__views.__alloyId4);
    $.__views.__alloyId2 = Ti.UI.createTab({
        window: $.__views.__alloyId3,
        title: "Acopio",
        id: "__alloyId2"
    });
    $.__views.__alloyId1.addTab($.__views.__alloyId2);
    $.__views.__alloyId6 = Ti.UI.createWindow({
        id: "__alloyId6"
    });
    $.__views.btn1 = Ti.UI.createButton({
        id: "btn1",
        title: "button1"
    });
    $.__views.__alloyId6.add($.__views.btn1);
    $.__views.__alloyId5 = Ti.UI.createTab({
        window: $.__views.__alloyId6,
        title: "Proceso",
        id: "__alloyId5"
    });
    $.__views.__alloyId1.addTab($.__views.__alloyId5);
    exports.destroy = function() {};
    _.extend($, $.__views);
    Ti.App.addEventListener("app:leerImg", function() {
        alert("Veeeeelllaaa");
    });
    $.index.open();
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;