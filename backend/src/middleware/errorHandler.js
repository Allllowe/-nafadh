// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next){
  const status = err.status || 500;
  if(status >= 500){
    console.error(err);
  }
  res.status(status).json({
    message: err.message || 'حدث خطأ غير متوقع في الخادم'
  });
}

module.exports = errorHandler;
