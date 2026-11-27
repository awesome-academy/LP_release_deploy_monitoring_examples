FROM ruby:4.0
WORKDIR /rails
ENV RAILS_ENV=production BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT=development:test
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
# Version và commit của bản build, ghi vào version.json để route /version trả về.
ARG APP_VERSION=dev
ARG APP_REVISION=unknown
RUN printf '{"version":"%s","commit":"%s"}\n' "$APP_VERSION" "$APP_REVISION" > version.json
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]
