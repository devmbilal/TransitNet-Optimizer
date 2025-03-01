exports.about = async (req, res) => {

    const locals = {
        title: 'About Us',
    }
    
    try {
      res.render('pages/about/about', locals);
    } catch (error) {
      console.log(error);
    }
}