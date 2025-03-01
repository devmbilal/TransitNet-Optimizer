exports.about = async (req, res) => {
    
    try {
      res.render('pages/about/about');
    } catch (error) {
      console.log(error);
    }
}