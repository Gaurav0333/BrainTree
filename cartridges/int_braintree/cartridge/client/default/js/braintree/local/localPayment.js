'use strict';
var braintreeLocal = require('../braintreeLocal');
var $lpmButton = document.querySelectorAll('.lpmButton');

$lpmButton.forEach(function (el) {
    var $btn = el;
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));
    var localIns = braintreeLocal.init(config, $btn);
    localIns.createLocalPayment();
});
