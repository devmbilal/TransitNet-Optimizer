exports.homepage = async (req, res) => {

    const locals = {
        pageName: 'Dashboard' 
    };

    try {
        res.render('pages/home/home', {
            locals,
        });
    } catch (error) {
        console.log(error);
    }
};
