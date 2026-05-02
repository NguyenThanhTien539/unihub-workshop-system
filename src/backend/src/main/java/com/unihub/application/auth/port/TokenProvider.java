package com.unihub.application.auth.port;

import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.TokenPair;

public interface TokenProvider {
  TokenPair issueTokenPair(CurrentUser user);
}

