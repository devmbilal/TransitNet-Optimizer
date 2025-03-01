

exports.homepage = async (req, res) => {

    const messages = req.flash('info');

    const locals = {
        title: 'Admin Panel',
        description: 'Smart Journey Planner-Road Safety Project',
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