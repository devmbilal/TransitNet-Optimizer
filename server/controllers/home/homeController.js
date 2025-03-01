

exports.homepage = async (req, res) => {

    const messages = req.flash('info');

    const locals = {
        title: 'TransitNet Optimizer',
        description: 'Optimizing Public Transport Routes through data-driven insights for smarter, more efficient urban mobility.',
    }

    try {
      res.render('pages/home/home', {
        locals,
        messages
      });

    } catch (error) {
      console.log(error);
    }
}