var stripe = Stripe('pk_test_huvfYfZy52M9DxyJ4gvMbR3i005P5qbajD');

document.getElementById('checkout').addEventListener("click", function(){
    stripe.redirectToCheckout({
        sessionId: sessionStripeID
      }).then(function (result) {

      });

})

var radios = document.getElementsByName('modeLivraison');

for(var i = radios.length; i--; ) {
    radios[i].addEventListener('change',function(){
      document.getElementById('formML').submit();
    })
}
